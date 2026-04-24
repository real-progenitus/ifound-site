import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { guardApiRequest } from '@/lib/api-guard';
import { createLogger } from '@/lib/logger';

const log = createLogger('region-counters');

export async function GET(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    name: 'region-counters',
    requestsPerMinute: 30,
  });
  if (blocked) return blocked;

  try {
    const snapshot = await db().collection('Dynamic').get();
    const regions: {
      name: string;
      bounds: {
        northEast: { lat: number; lng: number };
        southWest: { lat: number; lng: number };
      };
      counters: Record<string, number>;
    }[] = [];

    for (const doc of snapshot.docs) {
      if (!doc.id.endsWith('_boundaries')) continue;
      const data = doc.data();

      for (const key of Object.keys(data)) {
        if (key === 'updatedAt') continue;
        const region = data[key];
        if (typeof region !== 'object' || !region.bounds || !region.counters) continue;

        const { bounds, counters, name } = region;
        if (!bounds.northEast || !bounds.southWest) continue;

        // Defense-in-depth: the web app bypasses Firestore rules via the Admin
        // SDK, so we must never forward an unknown sub-object verbatim. Only
        // accept numeric counter entries; anything else (strings, nested
        // objects, future PII-ish fields) is dropped here.
        const safeCounters: Record<string, number> = {};
        if (typeof counters === 'object' && counters !== null) {
          for (const [catKey, catVal] of Object.entries(counters)) {
            if (typeof catVal === 'number' && Number.isFinite(catVal)) {
              safeCounters[catKey] = catVal;
            }
          }
        }

        regions.push({
          name: typeof name === 'string' && name ? name : key,
          bounds: {
            northEast: {
              lat: Number(bounds.northEast.lat),
              lng: Number(bounds.northEast.lng),
            },
            southWest: {
              lat: Number(bounds.southWest.lat),
              lng: Number(bounds.southWest.lng),
            },
          },
          counters: safeCounters,
        });
      }
    }

    return NextResponse.json(regions, {
      headers: {
        // Region counters update slowly — long CDN cache.
        'Cache-Control':
          'public, max-age=300, s-maxage=600, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    log.error('failed to fetch region counters', error);
    return NextResponse.json([], { status: 500 });
  }
}
