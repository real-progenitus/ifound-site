This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment variables

Required in production:

| Variable | Purpose |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Firebase admin credentials |
| `FIREBASE_CLIENT_EMAIL` | Firebase admin credentials |
| `FIREBASE_PRIVATE_KEY` | Firebase admin credentials |
| `UPSTASH_REDIS_REST_URL` | Rate limiting backend (Upstash Redis) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting backend (Upstash Redis) |

Optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | `https://ifound.tech,https://www.ifound.tech,http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of browser origins allowed to call `/api/*`. Requests from other origins are rejected with `403`. |
| `NEXT_PUBLIC_SITE_URL` | — | If set, added to the allow-list automatically. |

### API protection

Public `/api/*` endpoints have three layers of protection against abuse:

1. **Origin allowlist** — browser requests from origins outside `ALLOWED_ORIGINS`
   get `403 Forbidden`. See `lib/api-guard.ts`.
2. **Per-IP rate limit** — sliding-window rate limiter backed by Upstash Redis.
   Requests exceeding the budget get `429 Too Many Requests`.
3. **CDN caching** — each endpoint sets an aggressive `s-maxage` so the Vercel
   Edge serves repeated requests from cache, never touching Firestore.

| Endpoint | Rate limit | CDN cache |
| --- | --- | --- |
| `GET /api/map-posts` | 120 req / min / IP | 5 min (60s SWR) |
| `GET /api/counters` | 30 req / min / IP | 10 min (60s SWR) |
| `GET /api/partner-locations` | 30 req / min / IP | 15 min (120s SWR) |
| `GET /api/region-counters` | 30 req / min / IP | 10 min (120s SWR) |

If `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are not set, behaviour
depends on the environment:

- **Production** (`NODE_ENV=production`): `guardApiRequest` fails **closed**.
  Every guarded `/api/*` response is `503 Service Unavailable` (with
  `Retry-After: 60`) until the variables are restored. A missing or rotated
  credential must not silently regress the app to an unprotected state.
- **Development / test**: rate limiting is disabled (noop) and a one-shot
  warning is logged so the developer loop is not blocked by a missing Upstash
  credential.

As a second layer of defence, `npm run build` runs `scripts/check-prod-env.mjs`
as a `prebuild` hook. On a Vercel production deploy (`VERCEL_ENV=production`)
it refuses to build if any required variable is missing or empty, so the 503
state above should never be reached in normal operation. Other CI systems can
opt into the same check with `REQUIRE_PROD_ENV=1`.

To provision Upstash Redis: [console.upstash.com](https://console.upstash.com/)
→ Create Database → copy `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` from the REST API section into your Vercel project
environment variables.

As an additional safety net, set a Firestore/Firebase billing budget with
email alerts in [Google Cloud Console → Billing → Budgets & alerts](https://console.cloud.google.com/billing/).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
