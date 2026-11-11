import type { ShopEnvironment } from '@/lib/shop-env';

/**
 * Restricts the website shop to visitors in the countries it ships to.
 *
 * One rule, applied in three places that must agree: the nav link (shown only
 * where it would lead somewhere), the /shop page (a real 404 elsewhere), and
 * the checkout API (refused elsewhere, so the page cannot be bypassed by
 * posting to the route directly).
 *
 * Country comes from the header Vercel sets from the visitor's IP. That is a
 * guess, not a fact: a VPN or corporate egress can place someone in the wrong
 * country, and a Portuguese customer travelling abroad will not see the shop
 * until they are home. That trade-off was chosen deliberately. Stripe's
 * shipping-address restriction still applies on top, so the delivery address
 * remains the real limit on where orders can go.
 */
export const COUNTRY_HEADER = 'x-vercel-ip-country';

/** The visitor's ISO 3166-1 alpha-2 country, or null when it is unknown. */
export function visitorCountry(headers: { get(name: string): string | null }): string | null {
  const raw = headers.get(COUNTRY_HEADER);
  if (!raw) return null;
  const cc = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : null;
}

/**
 * Whether the header should exist at all. It is only ever set on Vercel, so
 * `next dev` and a local `next start` never have it — and treating that as
 * "outside every country" would make the shop impossible to work on locally.
 */
export function geoHeaderExpected(): boolean {
  return process.env.VERCEL === '1';
}

/**
 * Whether this visitor may see and use the shop.
 *
 * - QA mode is exempt. It only ever reaches QA_* collections and the Stripe
 *   test key, and a tester should be able to exercise the flow from anywhere.
 * - Unknown country: allowed off Vercel (local development), refused on it.
 *   Vercel always sets the header, so its absence there means something is
 *   wrong, and the shop is fail-closed everywhere else too.
 * - Otherwise the country must be in the shop's own shipping list, so the
 *   admin panel's country editor controls this as well as shipping.
 */
export function isVisitorInShopCountry({
  shopCountries,
  country,
  environment,
  headerExpected,
}: {
  shopCountries: string[];
  country: string | null;
  environment: ShopEnvironment;
  headerExpected: boolean;
}): boolean {
  if (environment === 'qa') return true;
  if (!country) return !headerExpected;
  return shopCountries.includes(country);
}

/**
 * Google's crawlers, recognised by user agent.
 *
 * They fetch from US addresses whatever country an ad or a search result
 * targets, so the country rule alone 404s them. Google Ads then rejects every
 * shop ad as "destination not working" (November 2026), and Search never indexes
 * the shop in any language.
 *
 * - AdsBot-Google (and -Mobile): Google Ads landing-page checks.
 * - Googlebot, Google-InspectionTool: Search crawling and Search Console tests.
 * - Storebot-Google: Shopping / Merchant Center.
 *
 * A user agent is trivially spoofed, which is acceptable because this only ever
 * decides who may VIEW the shop. The checkout route still applies
 * isVisitorInShopCountry alone, and Stripe's shipping-address list still
 * bounds where an order can go.
 */
const GOOGLE_CRAWLER_UA = /\b(?:AdsBot-Google|Googlebot|Google-InspectionTool|Storebot-Google)\b/i;

export function isGoogleCrawler(userAgent: string | null | undefined): boolean {
  return !!userAgent && GOOGLE_CRAWLER_UA.test(userAgent);
}

/**
 * Whether the shop PAGE (and the nav link to it) is shown: the country rule,
 * plus Google's crawlers so ads can be approved and the page indexed. Never use
 * this for the checkout, which must stay on isVisitorInShopCountry.
 */
export function mayViewShop(
  args: Parameters<typeof isVisitorInShopCountry>[0] & { userAgent: string | null },
): boolean {
  return isGoogleCrawler(args.userAgent) || isVisitorInShopCountry(args);
}
