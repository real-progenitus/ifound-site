import { cache } from 'react';
import { db } from '@/lib/firebase-admin';
import { createLogger } from '@/lib/logger';
import { shopCollection, type ShopEnvironment } from '@/lib/shop-env';

const log = createLogger('shop-config');

/**
 * Server-only reader for the shop catalogue at Dynamic/shop_config.
 *
 * The site is unauthenticated and the Dynamic collection is readable only by
 * signed-in users, so this must run through firebase-admin on the server. Never
 * import it into a client component.
 *
 * The types and the pricing formula below mirror
 * ifound-functions/functions/src/shop/shopConfig.ts and shopPricing.ts. There is
 * no shared package across those repos, so the arithmetic is written twice on
 * purpose — but both halves read the SAME Firestore document, so prices
 * themselves have exactly one home. If you change the formula here, change it
 * there too.
 */
export interface ShopPack {
  id: string;
  units: number;
  priceCents: number;
}

/**
 * A time-boxed percentage sale on the packs, started and ended from the admin
 * panel. Mirrors ShopPromotion in ifound-functions shopConfig.ts. The accessory
 * and shipping are never discounted.
 */
export interface ShopPromotion {
  active: boolean;
  percent: number;
  campaignId: string | null;
  startedAtMs: number | null;
  /** Over from this instant even before anything flips `active`. */
  endsAtMs: number | null;
}

export const MAX_SALE_PERCENT = 90;

export const DEFAULT_SHOP_PROMOTION: ShopPromotion = {
  active: false,
  percent: 0,
  campaignId: null,
  startedAtMs: null,
  endsAtMs: null,
};

export interface ShopConfig {
  shopEnabled: boolean;
  upsellEnabled: boolean;
  shopCountries: string[];
  upsellCountries: string[];
  currency: string;
  packs: ShopPack[];
  accessoryEnabled: boolean;
  accessoryPriceCents: number;
  accessoryShowImage: boolean;
  shippingCents: number;
  promotion: ShopPromotion;
}

/**
 * Fail-closed defaults. Both switches off and both country lists empty, so an
 * unreadable document renders a "coming soon" page rather than a shop that
 * takes money for goods we may not be able to ship.
 */
export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopEnabled: false,
  upsellEnabled: false,
  shopCountries: [],
  upsellCountries: [],
  currency: 'EUR',
  packs: [
    { id: 'tag_1', units: 1, priceCents: 1999 },
    { id: 'tag_2', units: 2, priceCents: 3799 },
    { id: 'tag_4', units: 4, priceCents: 7199 },
  ],
  accessoryEnabled: true,
  accessoryPriceCents: 100,
  accessoryShowImage: false,
  shippingCents: 0,
  promotion: DEFAULT_SHOP_PROMOTION,
};

function coerceBoolean(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback;
}

function coerceCents(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : fallback;
}

function coerceCountries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const cc = entry.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cc) && !out.includes(cc)) out.push(cc);
  }
  return out;
}

/**
 * Falls back to the defaults WHOLESALE rather than per-pack. A half-parsed
 * catalogue could drop a pack the page still offers, and a client/server price
 * disagreement is worse than showing the built-in prices.
 */
function coercePacks(raw: unknown, fallback: ShopPack[]): ShopPack[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const out: ShopPack[] = [];
  for (const entry of raw) {
    const p = entry as Partial<ShopPack>;
    if (typeof p?.id !== 'string' || !p.id.trim()) return fallback;
    if (typeof p.units !== 'number' || !Number.isInteger(p.units) || p.units < 1) return fallback;
    if (typeof p.priceCents !== 'number' || !Number.isInteger(p.priceCents) || p.priceCents < 0) {
      return fallback;
    }
    if (out.some((existing) => existing.id === p.id)) return fallback;
    out.push({ id: p.id.trim(), units: p.units, priceCents: p.priceCents });
  }
  return out;
}

function coerceMillis(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : null;
}

/** Anything malformed reads as "no sale", exactly as in the functions copy. */
function coercePromotion(raw: unknown): ShopPromotion {
  if (!raw || typeof raw !== 'object') return DEFAULT_SHOP_PROMOTION;
  const p = raw as Record<string, unknown>;
  const percent = p.percent;
  const validPercent =
    typeof percent === 'number' &&
    Number.isInteger(percent) &&
    percent >= 1 &&
    percent <= MAX_SALE_PERCENT;
  return {
    active: p.active === true && validPercent,
    percent: validPercent ? percent : 0,
    campaignId: typeof p.campaignId === 'string' && p.campaignId.trim() ? p.campaignId.trim() : null,
    startedAtMs: coerceMillis(p.startedAtMs),
    endsAtMs: coerceMillis(p.endsAtMs),
  };
}

/**
 * The percentage off pack prices right now, or 0. Kept identical to
 * activeSalePercent in ifound-functions shopConfig.ts and the app's
 * shopPricing.js.
 */
export function activeSalePercent(config: ShopConfig, nowMs: number = Date.now()): number {
  const promotion = config.promotion;
  if (!promotion?.active) return 0;
  const percent = promotion.percent;
  if (!Number.isInteger(percent) || percent < 1 || percent > MAX_SALE_PERCENT) return 0;
  if (typeof promotion.endsAtMs === 'number' && nowMs >= promotion.endsAtMs) return 0;
  return percent;
}

/** Same rounding as applySalePercent in ifound-functions shopPricing.ts. */
export function applySalePercent(cents: number, percent: number): number {
  return percent > 0 ? Math.round((cents * (100 - percent)) / 100) : cents;
}

/**
 * How long a read is reused across requests. The root layout needs this on
 * every page view, so without it the shop flag would add a Firestore read to
 * every visit to the site, including pages that have nothing to do with the
 * shop. A minute matches the cache the app and the cloud functions already use,
 * so an admin edit shows up everywhere on the same cadence.
 */
const CACHE_TTL_MS = 60 * 1000;

/** Cached per environment: QA and production hold different catalogues. */
const cached: Partial<Record<ShopEnvironment, { value: ShopConfig; expiresAt: number }>> = {};

/**
 * Reads the config for one environment. Wrapped in React's `cache` so a single
 * render that needs it in both the layout and the page body shares one call,
 * and backed by a short process-level TTL so repeat visits do not each hit
 * Firestore.
 *
 * Never throws: an unreadable document yields the fail-closed defaults.
 */
export const getShopConfig = cache(
  async (environment: ShopEnvironment = 'production'): Promise<ShopConfig> => {
  const hit = cached[environment];
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }
  try {
    const snap = await db()
      .collection(shopCollection('Dynamic', environment))
      .doc('shop_config')
      .get();
    const data = snap.data() ?? {};
    const d = DEFAULT_SHOP_CONFIG;
    const value: ShopConfig = {
      shopEnabled: coerceBoolean(data.shopEnabled, d.shopEnabled),
      upsellEnabled: coerceBoolean(data.upsellEnabled, d.upsellEnabled),
      shopCountries: coerceCountries(data.shopCountries),
      upsellCountries: coerceCountries(data.upsellCountries),
      currency:
        typeof data.currency === 'string' && data.currency.trim()
          ? data.currency.trim().toUpperCase()
          : d.currency,
      packs: coercePacks(data.packs, d.packs),
      accessoryEnabled: coerceBoolean(data.accessoryEnabled, d.accessoryEnabled),
      accessoryPriceCents: coerceCents(data.accessoryPriceCents, d.accessoryPriceCents),
      accessoryShowImage: coerceBoolean(data.accessoryShowImage, d.accessoryShowImage),
      shippingCents: coerceCents(data.shippingCents, d.shippingCents),
      promotion: coercePromotion(data.promotion),
    };
    cached[environment] = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch (error) {
    // Not cached: a transient Firestore failure must not close the shop for a
    // whole minute, so the next request tries again.
    log.error('failed to read shop_config; using fail-closed defaults', error, {
      environment,
    });
    return { ...DEFAULT_SHOP_CONFIG };
  }
  }
);

export interface PricedOrder {
  pack: ShopPack;
  units: number;
  accessoryQty: number;
  /** As charged — after any sale discount. */
  packPriceCents: number;
  /** The catalogue price before any sale. */
  listPackPriceCents: number;
  accessoryUnitPriceCents: number;
  shippingCents: number;
  amountCents: number;
  /** Percentage off the pack, or 0. */
  salePercent: number;
  saleCampaignId: string | null;
  currency: string;
}

export type PriceError =
  | 'invalid_pack'
  | 'invalid_accessory_qty'
  | 'accessory_unavailable'
  | 'zero_total';

/**
 * The amount formula. Kept byte-compatible with resolveShopAmount in
 * ifound-functions/functions/src/shop/shopPricing.ts.
 *
 * Returns a discriminated result rather than throwing, matching the hand-rolled
 * validation style used elsewhere on this site (see app/actions/sendPartnerEmail.ts).
 */
export function priceShopOrder(
  config: ShopConfig,
  input: { packId: unknown; accessoryQty: unknown },
  nowMs: number = Date.now()
): { ok: true; value: PricedOrder } | { ok: false; error: PriceError } {
  const packId = typeof input.packId === 'string' ? input.packId.trim() : '';
  const pack = config.packs.find((candidate) => candidate.id === packId);
  if (!pack) return { ok: false, error: 'invalid_pack' };

  const raw = input.accessoryQty;
  const accessoryQty = typeof raw === 'number' && Number.isInteger(raw) ? raw : 0;
  if (accessoryQty < 0) return { ok: false, error: 'invalid_accessory_qty' };
  // One case per tracker, no more.
  if (accessoryQty > pack.units) return { ok: false, error: 'invalid_accessory_qty' };
  if (accessoryQty > 0 && !config.accessoryEnabled) {
    return { ok: false, error: 'accessory_unavailable' };
  }

  // The sale touches the pack only — never the accessory or the delivery fee.
  const salePercent = activeSalePercent(config, nowMs);
  const packPriceCents = applySalePercent(pack.priceCents, salePercent);
  const amountCents =
    packPriceCents + accessoryQty * config.accessoryPriceCents + config.shippingCents;
  if (amountCents <= 0) return { ok: false, error: 'zero_total' };

  return {
    ok: true,
    value: {
      pack,
      units: pack.units,
      accessoryQty,
      packPriceCents,
      listPackPriceCents: pack.priceCents,
      accessoryUnitPriceCents: accessoryQty > 0 ? config.accessoryPriceCents : 0,
      shippingCents: config.shippingCents,
      amountCents,
      salePercent,
      saleCampaignId: salePercent > 0 ? config.promotion.campaignId : null,
      currency: config.currency,
    },
  };
}
