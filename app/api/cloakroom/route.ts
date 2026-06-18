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
