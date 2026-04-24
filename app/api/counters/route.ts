import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { guardApiRequest } from '@/lib/api-guard';
import { createLogger } from '@/lib/logger';

const log = createLogger('counters');

export async function GET(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    name: 'counters',
    requestsPerMinute: 30,
  });
  if (blocked) return blocked;

  const cacheHeaders = {
    // Browser: 5 min. CDN: 10 min with 60s SWR. This endpoint rarely changes.
    'Cache-Control':
      'public, max-age=300, s-maxage=600, stale-while-revalidate=60',
  };

  try {
    const doc = await db().collection('Dynamic').doc('total_counters').get();
    if (!doc.exists) {
      return NextResponse.json({ lost: 0, found: 0 }, { headers: cacheHeaders });
    }
    const data = doc.data();
    // The doc contains region keys, each with category counts. Sum them all.
    let total = 0;
    if (data) {
      for (const regionKey of Object.keys(data)) {
        const region = data[regionKey];
        if (typeof region === 'object' && region !== null) {
          for (const catCount of Object.values(region)) {
            if (typeof catCount === 'number') {
              total += catCount;
            }
          }
        }
      }
    }
    return NextResponse.json(
      { lost: total, found: 0 },
      { headers: cacheHeaders }
    );
  } catch (error) {
    log.error('failed to fetch counters', error);
    return NextResponse.json({ lost: 0, found: 0 }, { status: 500 });
  }
}
