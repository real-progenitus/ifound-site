import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/firebase-admin';
import { guardApiRequest } from '@/lib/api-guard';
import { createLogger } from '@/lib/logger';
import {
  resolveCloakroomEnvironment,
  cloakroomCollection,
} from '@/lib/cloakroom-env';

const log = createLogger('cloakroom');

const MAX_PHONE = 40;
const MAX_DESCRIPTION = 280;

/**
 * Public lookup used by the registration page to render the venue's branding
 * (logo + name) above the form, and to restore a previously-issued QR.
 *
 * - `?token=` looks up the item the customer already registered so the page can
 *   re-show its QR (instead of a blank form) when they return, and so the home
 *   page can redirect them back while the item is still active. Returns only the
 *   item's status and location — never the phone/description.
 * - `?locationId=` returns the venue's non-sensitive display fields (logo +
 *   name), and only when the location actually offers a cloakroom.
 */
export async function GET(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    name: 'cloakroom-location',
    requestsPerMinute: 60,
  });
  if (blocked) return blocked;

  const environment = resolveCloakroomEnvironment(
    request.nextUrl.searchParams.get('environment')
  );

  // Token lookup: report whether a registered item is still active so the
  // customer keeps access to their QR until it has been returned.
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (token) {
    const itemsCollection = cloakroomCollection('CloakroomItems', environment);
    try {
      const snap = await db()
        .collection(itemsCollection)
        .where('token', '==', token)
        .limit(1)
        .get();
      if (snap.empty) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const item = snap.docs[0].data();
      return NextResponse.json(
        {
          status: item.status ?? '',
          partnerLocationId: item.partnerLocationId ?? '',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (error) {
      log.error('failed to look up cloakroom item by token', error);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  const locationId = request.nextUrl.searchParams.get('locationId')?.trim();
  if (!locationId) {
    return NextResponse.json({ error: 'Missing location' }, { status: 400 });
  }

  const locationsCollection = cloakroomCollection('PartnerLocations', environment);

  try {
    const snap = await db().collection(locationsCollection).doc(locationId).get();
    const location = snap.data();
    if (
      !snap.exists ||
      !location ||
      location.isDeleted === true ||
      location.isActive === false ||
      location.hasCloakroom !== true
    ) {
      return NextResponse.json(
        { error: 'Cloakroom is not available at this location' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        title: location.title ?? '',
        logoUrl: location.logoUrl ?? '',
      },
      {
        headers: {
          'Cache-Control':
            'public, max-age=300, s-maxage=900, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    log.error('failed to fetch cloakroom location', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * Public endpoint hit by a customer registering an item at a venue cloakroom.
 * Creates a pending CloakroomItems doc and returns the secret token that the
 * customer's QR encodes. The partner's agent later scans that token in the app
 * to confirm the item into custody (and again to return it).
 */
export async function POST(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    name: 'cloakroom',
    requestsPerMinute: 20,
  });
  if (blocked) return blocked;

  let body: {
    partnerLocationId?: unknown;
    phone?: unknown;
    description?: unknown;
    environment?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const partnerLocationId =
    typeof body.partnerLocationId === 'string' ? body.partnerLocationId.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';

  // The submission page can opt into QA via its hidden browser-local toggle.
  // QA writes only ever land in the QA_* test collections, so we honor the
  // request in any environment; anything but an explicit "qa" stays production.
  const environment = resolveCloakroomEnvironment(body.environment);
  const locationsCollection = cloakroomCollection('PartnerLocations', environment);
  const itemsCollection = cloakroomCollection('CloakroomItems', environment);

  if (!partnerLocationId) {
    return NextResponse.json({ error: 'Missing location' }, { status: 400 });
  }
  if (!phone || phone.length > MAX_PHONE) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }
  if (!description || description.length > MAX_DESCRIPTION) {
    return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
  }

  try {
    const locationSnap = await db()
      .collection(locationsCollection)
      .doc(partnerLocationId)
      .get();

    const location = locationSnap.data();
    if (
      !locationSnap.exists ||
      !location ||
      location.isDeleted === true ||
      location.isActive === false ||
      location.hasCloakroom !== true
    ) {
      return NextResponse.json(
        { error: 'Cloakroom is not available at this location' },
        { status: 404 }
      );
    }

    const token = randomUUID();
    const now = Date.now();

    await db().collection(itemsCollection).add({
      partnerLocationId,
      partnerId: location.partnerId ?? '',
      phone,
      description,
      status: 'pending',
      token,
      createdAt: now,
      environment: environment === 'qa' ? 'QA' : 'PROD',
    });

    return NextResponse.json(
      { token },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    log.error('failed to create cloakroom item', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
