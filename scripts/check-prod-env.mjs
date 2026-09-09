#!/usr/bin/env node
/**
 * Deploy-time guard for required production env vars.
 *
 * Runs as the `prebuild` npm hook, so it fires automatically in front of
 * `next build`. On a Vercel production deploy (`VERCEL_ENV === 'production'`)
 * it refuses to build if any of the required variables are missing or empty.
 *
 * Non-production builds (`preview`, `development`, local `next build`) are
 * skipped silently so the developer loop isn't affected. Other CI systems
 * can opt in by setting `REQUIRE_PROD_ENV=1`.
 *
 * Paired with the runtime fail-closed behaviour in `lib/api-guard.ts`: this
 * script stops a bad deploy before it ships; the runtime guard is the
 * last-line defence if a variable is rotated away after the build.
 */

const REQUIRED = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

/**
 * STRIPE_SECRET_KEY is deliberately NOT in the list above.
 *
 * Whether the site needs it is decided at runtime by Dynamic/shop_config, not
 * at build time: with the shop switched off, /api/shop/checkout returns
 * shop_disabled before it ever constructs a Stripe client, so the key is not
 * merely unused, it is unreachable. Requiring it here blocked every deploy of
 * an unrelated change until a live payment key existed, which is the wrong
 * trade for a feature that ships switched off.
 *
 * The protection that matters lives where the decision does: the checkout route
 * refuses to open a session when the shop is enabled but the key is absent, and
 * says so loudly in the logs. A build-time check could not have covered that
 * case anyway, since the shop can be switched on from the admin panel long
 * after a deploy.
 */

const isVercelProd = process.env.VERCEL_ENV === 'production';
const isForced = process.env.REQUIRE_PROD_ENV === '1';

if (!isVercelProd && !isForced) {
  process.exit(0);
}

const missing = REQUIRED.filter((key) => {
  const v = process.env[key];
  return v === undefined || v === '';
});

if (missing.length > 0) {
  const bullet = (k) => `  - ${k}`;
  console.error(
    [
      '',
      '[check-prod-env] Missing required production environment variables:',
      ...missing.map(bullet),
      '',
      'These are required by lib/api-guard.ts (rate limiting) and',
      'lib/firebase-admin.ts (Firestore access). Refusing to build a',
      'production deploy without them — configure them in the Vercel',
      'project settings (Production scope) and retry.',
      '',
    ].join('\n')
  );
  process.exit(1);
}

console.log('[check-prod-env] All required production env vars present.');
