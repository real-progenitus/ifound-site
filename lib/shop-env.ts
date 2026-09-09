/**
 * Shop environment gating.
 *
 * The website shop can target either the live collections or the QA_* ones that
 * the app in QA mode and the QA cloud functions operate on. A tester opts in
 * with a hidden 12-tap gesture on the shop page, so QA can be exercised against
 * the production deployment without a separate site.
 *
 * Unlike the cloakroom's equivalent, the choice travels in a COOKIE rather than
 * a request body field. Two reasons: the shop page is server-rendered and has
 * to pick the right catalogue before it renders anything, and the checkout
 * route can then read the environment itself instead of trusting a value the
 * browser supplies. QA is still harmless to honour anywhere, since it only ever
 * reaches QA_* collections and the Stripe test key.
 */
export type ShopEnvironment = 'production' | 'qa';

/** Cookie the hidden toggle sets. Browser-local, never sent to anyone else. */
export const SHOP_QA_COOKIE = 'ifound-shop-qa';

/** A year. The toggle is sticky until a tester turns it off again. */
export const SHOP_QA_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Resolve the effective environment from a (possibly client-supplied) value.
 * Anything other than an explicit "1" resolves to production, so a malformed or
 * absent cookie can never accidentally put a real buyer into test mode.
 */
export const resolveShopEnvironment = (cookieValue?: unknown): ShopEnvironment =>
  cookieValue === '1' ? 'qa' : 'production';

/** Prefix a Firestore collection name with QA_ for the QA environment. */
export const shopCollection = (base: string, environment: ShopEnvironment): string =>
  environment === 'qa' ? `QA_${base}` : base;

/**
 * The value stamped onto Stripe metadata and onto the order document. The cloud
 * functions compare this against the environment the webhook endpoint serves,
 * so the spelling has to match ShopCollections.environment exactly.
 */
export const shopEnvironmentTag = (environment: ShopEnvironment): 'PROD' | 'QA' =>
  environment === 'qa' ? 'QA' : 'PROD';
