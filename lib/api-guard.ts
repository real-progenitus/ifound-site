import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Minimal read-only view of a request's headers.
 *
 * We accept anything with a `.get(name)` method that returns `string | null`
 * so the same guard can run against:
 *   • `NextRequest.headers` (public API routes, middleware)
 *   • `ReadonlyHeaders` from `next/headers` (server actions / RSC)
 */
interface HeaderBag {
  get(name: string): string | null;
}

/**
 * Central guard for public read-only /api/* endpoints.
 *
 * Protections applied (in order):
 *   1. Origin / Referer allowlist — rejects cross-site browser usage.
 *      (Server-to-server callers with no Origin header are still allowed;
 *      those are rate-limited by IP instead.)
 *   2. Per-IP rate limiting via Upstash Redis (sliding window), keyed on an
 *      edge-trusted client IP (see `getClientIp`) — NOT the raw left-most
 *      `X-Forwarded-For` entry, which an attacker can freely spoof.
 *   3. Secondary per-User-Agent rate limit, at a looser budget, to catch
 *      IP-rotation abuse where a single tool varies its source IP but keeps
 *      the same UA / fingerprint.
 *
 * If the Upstash env vars are not configured:
 *   - In development / test, rate limiting is silently disabled so the app
 *     keeps working, and a warning is logged once per process.
 *   - In production (`NODE_ENV === 'production'`) the guard fails CLOSED:
 *     every request is answered with `503 Service Unavailable` until the
 *     configuration is fixed. A misconfigured deploy (or an env-var wipe)
 *     must not silently regress to unprotected routes.
 *
 * A build-time check (`scripts/check-prod-env.mjs`, wired into the `prebuild`
 * npm script) additionally refuses to build a Vercel production deploy that
 * is missing these variables, so the 503 state should never be reached in
 * normal operation.
 *
 * Required env vars for production:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Optional env vars:
 *   ALLOWED_ORIGINS  Comma-separated list of origins allowed to call the API.
 *                    Defaults to the ifound.tech origins + localhost for dev.
 */

type Limiter = {
  limit: (id: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

const ratelimiters = new Map<string, Limiter>();
let redisClient: Redis | null | undefined;
let loggedMissingRedis = false;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

/**
 * Log the missing-config condition exactly once per process. In production
 * we escalate to `console.error` because the guard is now refusing traffic —
 * operators need this to be loud in their log drain.
 */
function logMissingRedisOnce(): void {
  if (loggedMissingRedis) return;
  loggedMissingRedis = true;
  if (isProduction()) {
    console.error(
      '[api-guard] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set in production. Failing closed with 503 until configuration is restored.'
    );
  } else {
    console.warn(
      '[api-guard] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is DISABLED for local development. Production deploys will refuse to boot without these.'
    );
  }
}

function getLimiter(name: string, requestsPerMinute: number): Limiter | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${name}:${requestsPerMinute}`;
  let rl = ratelimiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requestsPerMinute, '1 m'),
      analytics: false,
      prefix: `ifound:ratelimit:${name}`,
    }) as unknown as Limiter;
    ratelimiters.set(key, rl);
  }
  return rl;
}

/**
 * Extract the true client IP.
 *
 * Threat model: an attacker sends their own `X-Forwarded-For: 1.2.3.4` header
 * and rotates the value per request, hoping to sidestep the per-IP sliding
 * window. Vercel / Cloudflare defend against this by *appending* the real
 * client IP to the RIGHT of any client-supplied XFF. So picking the left-most
 * entry (what we used to do) is exactly what an attacker wants.
 *
 * We therefore:
 *   1. Prefer headers that the edge sets and the client cannot forge:
 *      - `x-vercel-forwarded-for` (Vercel-only; stripped from client input)
 *      - `x-real-ip` (also set by Vercel / Cloudflare to the true client IP)
 *   2. Fall back to `x-forwarded-for` parsed RIGHT-to-left, skipping entries
 *      in private / loopback / link-local ranges (those are just internal
 *      proxy hops, never a real public client).
 */
function getClientIp(headers: HeaderBag): string {
  const vercel = headers.get('x-vercel-forwarded-for');
  if (vercel) {
    // Vercel controls this header end-to-end, so the left-most entry is the
    // real client IP (it prepends, never appends client-supplied values).
    const first = vercel.split(',')[0]?.trim();
    if (first) return first;
  }

  const real = headers.get('x-real-ip');
  if (real) {
    const trimmed = real.trim();
    if (trimmed) return trimmed;
  }

  const fwd = headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i];
      if (candidate && !isPrivateAddress(candidate)) return candidate;
    }
    // All entries were private (typical in local dev behind a single proxy).
    // Use the right-most one; at worst every dev request shares a bucket.
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return 'unknown';
}

/**
 * Best-effort private / loopback / link-local / ULA check, used when walking
 * X-Forwarded-For right-to-left. We only need to detect "this is an internal
 * hop, keep walking", so the list doesn't need to be exhaustive.
 */
function isPrivateAddress(ip: string): boolean {
  let v = ip;
  // Strip ::ffff:1.2.3.4 IPv4-mapped prefix and bracketed IPv6.
  if (v.startsWith('[') && v.includes(']')) v = v.slice(1, v.indexOf(']'));
  if (v.toLowerCase().startsWith('::ffff:')) v = v.slice(7);
  // For IPv4 with optional :port, the first colon-split segment is the address.
  const v4 = v.includes('.') ? v.split(':')[0] : v;
  if (/^(?:10|127)\./.test(v4)) return true;
  if (/^192\.168\./.test(v4)) return true;
  if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(v4)) return true;
  if (/^169\.254\./.test(v4)) return true;
  if (v4 === '0.0.0.0') return true;
  const v6 = v.toLowerCase();
  if (v6 === '::1') return true;
  if (/^fe[89ab]/i.test(v6)) return true; // fe80::/10 link-local
  if (/^f[cd]/i.test(v6)) return true; // fc00::/7 ULA
  return false;
}

/**
 * Fast non-cryptographic hash (FNV-1a 32-bit).
 *
 * We use this to bucket the User-Agent into a short, stable key for rate
 * limiting. We do NOT need collision resistance — a colliding UA just means
 * two different browser fingerprints happen to share the same bucket, which
 * is an acceptable false-positive for a secondary defence layer.
 */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS;
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://ifound.tech',
    'https://www.ifound.tech',
  ];
  return site ? [site, ...defaults] : defaults;
}

function isOriginAllowed(headers: HeaderBag): boolean {
  const origin = headers.get('origin');
  const referer = headers.get('referer');
  // Server-to-server requests (and some curl usage) have neither header.
  // We don't block those — the IP rate limit is our defense there.
  if (!origin && !referer) return true;

  const allowed = getAllowedOrigins();
  const candidate = origin ?? (referer ? new URL(referer).origin : null);
  if (!candidate) return true;
  return allowed.some((a) => {
    try {
      return new URL(a).origin === new URL(candidate).origin;
    } catch {
      return false;
    }
  });
}

export interface GuardOptions {
  /** Logical name used in the rate-limit key prefix (e.g. "map-posts"). */
  name: string;
  /** Per-IP request budget per minute. Default: 60. */
  requestsPerMinute?: number;
}

/**
 * Structured outcome of the guard checks. Lets non-API callers (e.g.
 * middleware protecting a Server Component page) build their own response
 * shape — HTML 429 / plain text / rewrite — without us hard-coding a JSON
 * body that would be ugly in a browser.
 */
export type GuardCheckResult =
  | { ok: true }
  | { ok: false; status: 403 }
  | { ok: false; status: 503; retryAfter: number }
  | {
      ok: false;
      status: 429;
      retryAfter: number;
      limit: number;
      remaining: number;
      reset: number;
    };

/**
 * Lower-level guard: run origin + rate-limit checks against an arbitrary
 * header bag and return a structured result. Callers decide how to render
 * the rejection (JSON for /api, plain text for a page, a rewrite to a static
 * error page, etc.).
 *
 * This is the shared core used by `guardApiRequest` (public read-only API
 * routes), the profile-page middleware guard, and `checkServerActionGuard`
 * (mutating form submissions).
 */
export async function checkHeaderGuard(
  headers: HeaderBag,
  options: GuardOptions
): Promise<GuardCheckResult> {
  if (!isOriginAllowed(headers)) {
    return { ok: false, status: 403 };
  }

  // Fail-closed guardrail: if the rate-limit backend is not configured at all,
  // we must NOT proceed in production. A blank / rotated-away env var would
  // otherwise silently disable the per-IP budget and regress us to the
  // pre-guard scraping-is-free state. In dev we still proceed (noop) so the
  // developer loop isn't held hostage by a missing Upstash credential.
  if (!getRedis()) {
    logMissingRedisOnce();
    if (isProduction()) {
      return { ok: false, status: 503, retryAfter: 60 };
    }
    return { ok: true };
  }

  const ipBudget = options.requestsPerMinute ?? 60;
  const ipLimiter = getLimiter(options.name, ipBudget);

  if (!ipLimiter) return { ok: true };

  const ip = getClientIp(headers);
  const ua = headers.get('user-agent') ?? 'unknown';
  const uaHash = fnv1a(ua);

  // Primary bucket: per-IP. The UA hash is folded in so two distinct clients
  // behind the same NAT don't evict each other any faster than necessary.
  const ipIdentifier = `${options.name}:ip:${ip}:${uaHash}`;

  // Secondary bucket: per-UA only. Catches the case from the threat model
  // where an attacker rotates spoofed IPs but keeps the same UA/tooling —
  // all their requests collapse into one shared budget here. The budget is
  // intentionally looser (10x) so large NATs (offices, carriers) with many
  // real users on the same default UA don't false-positive.
  const uaBudget = ipBudget * 10;
  const uaLimiter = getLimiter(`${options.name}:ua`, uaBudget);
  const uaIdentifier = `${options.name}:ua:${uaHash}`;

  const [ipResult, uaResult] = await Promise.all([
    ipLimiter.limit(ipIdentifier),
    uaLimiter ? uaLimiter.limit(uaIdentifier) : Promise.resolve(null),
  ]);

  const failed = !ipResult.success
    ? ipResult
    : uaResult && !uaResult.success
      ? uaResult
      : null;

  if (failed) {
    const retryAfter = Math.max(1, Math.ceil((failed.reset - Date.now()) / 1000));
    return {
      ok: false,
      status: 429,
      retryAfter,
      limit: failed.limit,
      remaining: failed.remaining,
      reset: failed.reset,
    };
  }

  return { ok: true };
}

/**
 * Backwards-compatible wrapper around `checkHeaderGuard` that accepts a
 * `NextRequest`. Existing call sites in `middleware.ts` and API routes use
 * this name; the public signature is preserved.
 */
export async function checkRequestGuard(
  request: NextRequest,
  options: GuardOptions
): Promise<GuardCheckResult> {
  return checkHeaderGuard(request.headers, options);
}

/**
 * Guard a React Server Action / form submission.
 *
 * Server actions don't receive a `NextRequest`, so we read the current
 * request's headers via `next/headers`. Everything else (origin allowlist,
 * per-IP + per-UA Upstash rate limit, fail-closed on missing config) behaves
 * exactly like the API-route guard, which keeps mutating endpoints on the
 * same protection contract as read-only ones.
 *
 * Note: this runs *inside* the server action, so the caller is responsible
 * for turning the structured `GuardCheckResult` into whatever response shape
 * their form UI expects (typically `{ success: false, error }`).
 */
export async function checkServerActionGuard(
  options: GuardOptions
): Promise<GuardCheckResult> {
  // `next/headers` is dynamically imported so this module can still be loaded
  // from non-request contexts (e.g. a unit test that only exercises the
  // request-based path without mocking Next.js).
  const { headers } = await import('next/headers');
  const h = await headers();
  return checkHeaderGuard(h, options);
}

/**
 * Run all protections for a public API route.
 * Returns a `NextResponse` (403 / 429 / 503) if the request should be rejected,
 * or `null` if the request may proceed.
 */
export async function guardApiRequest(
  request: NextRequest,
  options: GuardOptions
): Promise<NextResponse | null> {
  const result = await checkRequestGuard(request, options);
  if (result.ok) return null;

  if (result.status === 403) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (result.status === 503) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(result.retryAfter),
        },
      }
    );
  }

  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}
