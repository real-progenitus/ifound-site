/**
 * Tests for `guardApiRequest`, focused on the behaviour around
 * rate-limiter misconfiguration and Upstash transport failures.
 *
 * The guard caches its Redis client and "already logged" flag at module
 * scope, so every test calls `vi.resetModules()` + re-imports the module
 * to start from a clean slate.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

function req(): NextRequest {
  // No Origin / Referer header -> origin check passes. That isolates these
  // tests to the rate-limiting branch we actually care about.
  return new NextRequest('http://localhost/api/test');
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('guardApiRequest — Redis misconfiguration', () => {
  it('fails closed with 503 in production when Redis env vars are missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { guardApiRequest } = await import('@/lib/api-guard');

    const r1 = await guardApiRequest(req(), { name: 'test' });
    expect(r1).not.toBeNull();
    expect(r1!.status).toBe(503);
    expect(r1!.headers.get('Cache-Control')).toBe('no-store');
    expect(r1!.headers.get('Retry-After')).toBe('60');

    // Subsequent requests should still be blocked, but the error log should
    // fire at most once per process to avoid filling the log drain.
    const r2 = await guardApiRequest(req(), { name: 'test' });
    expect(r2!.status).toBe(503);
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  it('fails closed with 503 in production when only one env var is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { guardApiRequest } = await import('@/lib/api-guard');
    const res = await guardApiRequest(req(), { name: 'test' });
    expect(res!.status).toBe(503);
  });

  it('noops (returns null) in development when Redis env vars are missing', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { guardApiRequest } = await import('@/lib/api-guard');

    expect(await guardApiRequest(req(), { name: 'test' })).toBeNull();
    expect(await guardApiRequest(req(), { name: 'test' })).toBeNull();
    // Warning should be emitted once per process, not once per request.
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('guardApiRequest — Upstash transport errors', () => {
  it('propagates exceptions from limiter.limit() (fail-closed at the handler)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok_fake');

    // Replace @upstash/ratelimit so `limit()` rejects as if Upstash were down
    // or the network dropped. The contract we are pinning here is:
    //   "if the limiter throws, guardApiRequest MUST throw too"
    // so the caller's try/catch turns it into a 500. That's the correct
    // behaviour — we do NOT silently let the request through on transport
    // errors (which would be the open-failure mode we built this layer to
    // avoid).
    vi.doMock('@upstash/ratelimit', () => {
      class FakeRatelimit {
        static slidingWindow() {
          return { kind: 'sliding-window' };
        }
        async limit() {
          throw new Error('upstash unreachable');
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

    await expect(
      guardApiRequest(req(), { name: 'test' })
    ).rejects.toThrow('upstash unreachable');
  });
});
