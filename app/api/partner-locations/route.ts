import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { guardApiRequest } from '@/lib/api-guard';
import { createLogger } from '@/lib/logger';

const log = createLogger('partner-locations');

export async function GET(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    name: 'partner-locations',
    requestsPerMinute: 30,
  });
  if (blocked) return blocked;

  try {
    const snapshot = await db()
      .collection('PartnerLocations')
      .where('isActive', '==', true)
      .where('isDeleted', '==', false)
      .get();

    const locations = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title ?? '',
        logoUrl: d.logoUrl ?? '',
        contact: d.contact ?? '',
        partnerId: d.partnerId ?? '',
        latitude: d.pinLocation?.latitude ?? 0,
        longitude: d.pinLocation?.longitude ?? 0,
      };
    });

    return NextResponse.json(locations, {
      headers: {
        // Partners list changes rarely — cache aggressively at the CDN.
        'Cache-Control':
          'public, max-age=300, s-maxage=900, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    log.error('failed to fetch partner locations', error);
    return NextResponse.json([], { status: 500 });
  }
}
