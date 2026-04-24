/**
 * Tests for `checkRequestGuard`, the lower-level structured-result variant
 * of `guardApiRequest`. Non-API callers (currently the profile-page
 * middleware) depend on this function returning a discriminated-union
 * result they can render however they want — plain text for a page,
 * JSON for /api, etc. If those shapes drift, every caller either silently
 * regresses to "let everything through" or starts returning the wrong body,
 * so we pin them here.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

function req(init?: { origin?: string; referer?: string }): NextRequest {
  const headers: Record<string, string> = {};
  if (init?.origin) headers['origin'] = init.origin;
  if (init?.referer) headers['referer'] = init.referer;
  return new NextRequest('http://localhost/profile/abc123', { headers });
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('checkRequestGuard — origin check', () => {
  it('rejects with 403 when Origin is not in the allowlist', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOWED_ORIGINS', 'https://ifound.tech');

    const { checkRequestGuard } = await import('@/lib/api-guard');
    const result = await checkRequestGuard(
      req({ origin: 'https://evil.example' }),
      { name: 'profile-page' }
    );

    expect(result.ok).toBe(false);
    // Status is narrowed from the union; assert the exact shape.
    if (!result.ok) {
      expect(result.status).toBe(403);
      // 403 has no retryAfter / rate-limit metadata.
      expect('retryAfter' in result).toBe(false);
    }
  });

  it('allows requests with no Origin / Referer (server-to-server)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    // No Upstash env -> dev noop path; we want to confirm the origin check
    // itself is not what blocks a missing Origin.
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { checkRequestGuard } = await import('@/lib/api-guard');
    const result = await checkRequestGuard(req(), { name: 'profile-page' });
    expect(result.ok).toBe(true);
  });
});

describe('checkRequestGuard — Redis misconfiguration', () => {
  it('fails with 503+retryAfter in production when Redis is unconfigured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { checkRequestGuard } = await import('@/lib/api-guard');
    const result = await checkRequestGuard(req(), { name: 'profile-page' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      if (result.status === 503) {
        expect(result.retryAfter).toBe(60);
      }
    }
  });

  it('passes through (ok:true) in development when Redis is unconfigured', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { checkRequestGuard } = await import('@/lib/api-guard');
    const result = await checkRequestGuard(req(), { name: 'profile-page' });
    expect(result.ok).toBe(true);
  });
});

describe('checkRequestGuard — rate-limit metadata', () => {
  it('returns a 429 with retryAfter + limit/remaining/reset on exhaustion', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok_fake');

    // Fake limiter whose first .limit() call fails with metadata the caller
    // (middleware) needs to build Retry-After / X-RateLimit-* headers.
    const resetMs = Date.now() + 30_000;
    vi.doMock('@upstash/ratelimit', () => {
      class FakeRatelimit {
        static slidingWindow() {
          return { kind: 'sliding-window' };
        }
        async limit() {
          return {
            success: false,
            limit: 30,
            remaining: 0,
            reset: resetMs,
          };
        }
      }
      return { Ratelimit: FakeRatelimit };
    });
    vi.doMock('@upstash/redis', () => ({
      Redis: class FakeRedis {
        constructor(_opts: unknown) {}
      },
    }));

    const { checkRequestGuard } = await import('@/lib/api-guard');
    const result = await checkRequestGuard(req(), {
      name: 'profile-page',
      requestsPerMinute: 30,
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.status === 429) {
      expect(result.limit).toBe(30);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBe(resetMs);
      // retryAfter should be a positive integer number of seconds, clamped
      // to >= 1 so a caller that stringifies it into Retry-After never emits
      // "0" (which browsers treat as "retry immediately").
      expect(result.retryAfter).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(result.retryAfter)).toBe(true);
    }
  });

  it('returns ok:true when the limiter accepts the request', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok_fake');

    vi.doMock('@upstash/ratelimit', () => {
      class FakeRatelimit {
        static slidingWindow() {
          return { kind: 'sliding-window' };
        }
        async limit() {
          return {
            success: true,
            limit: 30,
            remaining: 29,
            reset: Date.now() + 60_000,
          };
        }
      }
      return { Ratelimit: FakeRatelimit };
    });
    vi.doMock('@upstash/redis', () => ({
      Redis: class FakeRedis {
        constructor(_opts: unknown) {}
      },
    }));

    const { checkRequestGuard } = await import('@/lib/api-guard');
    const result = await checkRequestGuard(req(), {
      name: 'profile-page',
      requestsPerMinute: 30,
    });
    expect(result.ok).toBe(true);
  });
});

describe('guardApiRequest — preserves existing JSON contract', () => {
  /**
   * After refactoring the core into checkRequestGuard, the public-facing
   * guardApiRequest wrapper is the one the /api/* routes still call. The
   * field-projection integration test mocks it out, so we pin its response
   * shape here to catch any regression in the wrapper itself.
   */
  it('maps a 429 result to a JSON response with the full header set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok_fake');

    const resetMs = Date.now() + 45_000;
    vi.doMock('@upstash/ratelimit', () => {
      class FakeRatelimit {
        static slidingWindow() {
          return { kind: 'sliding-window' };
        }
        async limit() {
          return {
            success: false,
            limit: 42,
            remaining: 0,
            reset: resetMs,
          };
        }
      }
      return { Ratelimit: FakeRatelimit };
    });
    vi.doMock('@upstash/redis', () => ({
      Redis: class FakeRedis {
        constructor(_opts: unknown) {}
      },
    }));

    const { guardApiRequest } = await import('@/lib/api-guard');
    const res = await guardApiRequest(req(), {
      name: 'test',
      requestsPerMinute: 42,
    });

    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get('Cache-Control')).toBe('no-store');
    expect(res!.headers.get('X-RateLimit-Limit')).toBe('42');
    expect(res!.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res!.headers.get('X-RateLimit-Reset')).toBe(String(resetMs));
    expect(res!.headers.get('Retry-After')).not.toBeNull();

    const body = await res!.json();
    expect(body).toEqual({ error: 'Too many requests' });
  });

  it('maps a 403 (forbidden origin) to a JSON 403 with no-store', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOWED_ORIGINS', 'https://ifound.tech');

    const { guardApiRequest } = await import('@/lib/api-guard');
    const res = await guardApiRequest(
      req({ origin: 'https://evil.example' }),
      { name: 'test' }
    );

    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    expect(res!.headers.get('Cache-Control')).toBe('no-store');
    // 403 must NOT include rate-limit headers (they'd be meaningless here
    // and could mislead a client into thinking it just needs to wait).
    expect(res!.headers.get('Retry-After')).toBeNull();
    expect(res!.headers.get('X-RateLimit-Limit')).toBeNull();
  });
});
