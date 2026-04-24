/**
 * Tests for the profile-page guard + Cache-Control behaviour added to
 * `middleware.ts`.
 *
 * The profile page returns PII (email, phone) for any uid and was previously
 * `force-dynamic` with no rate limit in front of it. The middleware is now
 * the chokepoint: it must block before Next renders the Server Component
 * (i.e. before Firestore gets hit) and, on success, attach a CDN cache
 * header so repeat visitors to the same uid don't keep billing us for
 * Firestore reads.
 *
 * Routes unrelated to `/profile/[uid]` must be untouched so the rest of the
 * site keeps working the way next-intl expects.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Stub next-intl middleware to a deterministic pass-through. We're testing
// our own logic (profile-path detection, guard wiring, Cache-Control
// attachment), not next-intl's locale routing.
vi.mock('next-intl/middleware', () => ({
  default: () => (_req: NextRequest) => NextResponse.next(),
}));

// The routing module pulls in `next-intl/navigation` which in turn reaches
// for `next/navigation` — an entry point Next.js resolves via its custom
// bundler, not vanilla Node ESM. Mock it out with the minimal shape the
// middleware under test actually uses.
vi.mock('@/routing', () => ({
  routing: {
    locales: ['en', 'pt', 'es', 'fr', 'it', 'de'],
    defaultLocale: 'en',
    localePrefix: 'as-needed',
  },
}));

function req(pathname: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`);
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.doUnmock('@/lib/api-guard');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('middleware — profile path detection', () => {
  it.each([
    '/profile/abc123',
    '/en/profile/abc123',
    '/pt/profile/abc123',
    '/es/profile/abc123',
    '/fr/profile/abc123',
    '/it/profile/abc123',
    '/de/profile/abc123',
    '/profile/abc123/', // trailing slash
  ])('invokes the guard for %s', async (path) => {
    const checkRequestGuard = vi.fn(async () => ({ ok: true as const }));
    vi.doMock('@/lib/api-guard', () => ({ checkRequestGuard }));

    const { default: middleware } = await import('@/middleware');
    await middleware(req(path));

    expect(checkRequestGuard).toHaveBeenCalledTimes(1);
    expect(checkRequestGuard).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        name: 'profile-page',
        requestsPerMinute: 30,
      })
    );
  });

  it.each([
    '/', // root
    '/about',
    '/en/about',
    '/contact',
    '/map',
    '/download',
    '/profile', // no uid segment
    '/profile/', // no uid segment, trailing slash
    '/profile/abc/extra', // deeper path; not the profile leaf
    '/en/profile/abc/extra',
    '/profiles/abc123', // near-miss spelling
    '/en/profiles/abc123',
  ])('does NOT invoke the guard for %s', async (path) => {
    const checkRequestGuard = vi.fn(async () => ({ ok: true as const }));
    vi.doMock('@/lib/api-guard', () => ({ checkRequestGuard }));

    const { default: middleware } = await import('@/middleware');
    await middleware(req(path));

    expect(checkRequestGuard).not.toHaveBeenCalled();
  });
});

describe('middleware — rejection behaviour', () => {
  it('returns a 429 text response with Retry-After when the guard denies', async () => {
    const checkRequestGuard = vi.fn(async () => ({
      ok: false as const,
      status: 429 as const,
      retryAfter: 42,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 42_000,
    }));
    vi.doMock('@/lib/api-guard', () => ({ checkRequestGuard }));

    const { default: middleware } = await import('@/middleware');
    const res = await middleware(req('/profile/abc123'));

    expect(res.status).toBe(429);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Retry-After')).toBe('42');
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toBe('Too many requests');
  });

  it('returns 403 without Retry-After when origin is not allowed', async () => {
    const checkRequestGuard = vi.fn(async () => ({
      ok: false as const,
      status: 403 as const,
    }));
    vi.doMock('@/lib/api-guard', () => ({ checkRequestGuard }));

    const { default: middleware } = await import('@/middleware');
    const res = await middleware(req('/profile/abc123'));

    expect(res.status).toBe(403);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Retry-After')).toBeNull();
    expect(await res.text()).toBe('Forbidden');
  });

  it('returns 503 with Retry-After when the rate-limit backend is down', async () => {
    const checkRequestGuard = vi.fn(async () => ({
      ok: false as const,
      status: 503 as const,
      retryAfter: 60,
    }));
    vi.doMock('@/lib/api-guard', () => ({ checkRequestGuard }));

    const { default: middleware } = await import('@/middleware');
    const res = await middleware(req('/profile/abc123'));

    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(await res.text()).toBe('Service temporarily unavailable');
  });
});

describe('middleware — Cache-Control attachment', () => {
  it('sets public s-maxage=60 stale-while-revalidate=300 on allowed profile responses', async () => {
    const checkRequestGuard = vi.fn(async () => ({ ok: true as const }));
    vi.doMock('@/lib/api-guard', () => ({ checkRequestGuard }));

    const { default: middleware } = await import('@/middleware');
    const res = await middleware(req('/profile/abc123'));

    // The underlying next-intl mock returns NextResponse.next(), which
    // carries no Cache-Control by default. Our middleware must add it.
    expect(res.headers.get('Cache-Control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=300'
    );
  });

  it('does NOT attach Cache-Control to non-profile routes', async () => {
    const checkRequestGuard = vi.fn(async () => ({ ok: true as const }));
    vi.doMock('@/lib/api-guard', () => ({ checkRequestGuard }));

    const { default: middleware } = await import('@/middleware');
    const res = await middleware(req('/about'));

    expect(res.headers.get('Cache-Control')).toBeNull();
  });
});
