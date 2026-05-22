import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-guard';
import { listSubmissions } from '@/lib/submissions';
import { createLogger } from '@/lib/logger';

/**
 * GET /api/partner-submissions?limit=N
 *
 * Returns the N most recent partner submissions (default 20, max 100).
 * Used by the homepage to display the submissions grid.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('partner-submissions');

export async function GET(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    name: 'partner-submissions',
    requestsPerMinute: 60,
  });
  if (blocked) return blocked;

  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '20', 10) || 20));

  try {
    const submissions = await listSubmissions(limit);
    return NextResponse.json(submissions, {
      headers: {
        // Short public cache: fresh enough for typical usage, avoids hitting
        // Redis on every page view if a CDN sits in front.
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    log.error('failed to list submissions', err);
    return NextResponse.json([], { status: 500 });
  }
}
