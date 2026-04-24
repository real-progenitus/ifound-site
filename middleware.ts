import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './routing';
import { checkRequestGuard } from './lib/api-guard';

const intlMiddleware = createMiddleware(routing);

/**
 * Matches `/profile/[uid]` and `/{locale}/profile/[uid]`.
 *
 * The profile page reads PII (email, phone) for any uid. Firebase uids are
 * 28-char high-entropy strings so blind enumeration is infeasible, but an
 * attacker with a scraped list of uids could otherwise iterate them with
 * unbounded origin reads. Rate limiting at the edge (before Next renders the
 * Server Component) bounds Firestore cost and PII harvest independent of
 * whether force-dynamic is set or a CDN cache absorbs the load.
 *
 * We intentionally check the RAW pathname here — next-intl rewrites internally
 * but the prefix in the URL the client sent is what we match on.
 */
const PROFILE_PATH_RE =
  /^\/(?:(?:en|es|pt|fr|it|de)\/)?profile\/[^/]+\/?$/;

/**
 * Cache-Control for *successful* profile renders. Every unique uid still pays
 * the origin cost on first hit (where the per-IP rate limit applies), but
 * subsequent visitors within s-maxage=60 are served from Vercel's edge — so
 * the typical "friend opens the QR code" traffic never touches Firestore.
 * stale-while-revalidate=300 avoids a thundering-herd refresh after the TTL.
 */
const PROFILE_CACHE_CONTROL =
  'public, s-maxage=60, stale-while-revalidate=300';

function isProfilePath(pathname: string): boolean {
  return PROFILE_PATH_RE.test(pathname);
}

function buildBlockedResponse(
  status: 403 | 429 | 503,
  retryAfter?: number
): NextResponse {
  const body =
    status === 429
      ? 'Too many requests'
      : status === 403
        ? 'Forbidden'
        : 'Service temporarily unavailable';
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  };
  if (retryAfter != null) headers['Retry-After'] = String(retryAfter);
  return new NextResponse(body, { status, headers });
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isProfilePath(pathname)) {
    const guard = await checkRequestGuard(request, {
      name: 'profile-page',
      // Tighter than the map endpoints: a human looking at a single profile
      // page will refresh a handful of times per minute at most. Automated
      // uid-iteration scrapers are what this budget is sized against.
      requestsPerMinute: 30,
    });
    if (!guard.ok) {
      return buildBlockedResponse(
        guard.status,
        guard.status === 403 ? undefined : guard.retryAfter
      );
    }
  }

  const response = intlMiddleware(request);

  // next-intl may return a redirect / rewrite NextResponse; attach the CDN
  // cache header to any response it produces for profile paths. For a 404
  // rendered by notFound() inside the page, Next.js's own response pipeline
  // takes over and its default "no-store for errors" behaviour applies, so
  // we don't end up caching missing-profile pages here.
  if (isProfilePath(pathname) && response) {
    response.headers.set('Cache-Control', PROFILE_CACHE_CONTROL);
  }

  return response;
}

export const config = {
  matcher: ['/', '/(en|es|pt|fr|it|de)/:path*', '/((?!_next|_vercel|api|download|.*\\..*).*)']
};
