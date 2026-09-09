/**
 * Tests for the shop's amount formula and for the product copy.
 *
 * The formula is duplicated in ifound-functions/functions/src/shop/shopPricing.ts,
 * because the website creates its own Stripe Checkout Session and there is no
 * shared package across those repos. Both halves read the same Firestore
 * document, so prices have one home — but the arithmetic can drift, and the
 * locked totals below are what catches it. If a case here changes, check the
 * other implementation.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { DEFAULT_SHOP_CONFIG, priceShopOrder, type ShopConfig } from '../shop-config';

const config: ShopConfig = { ...DEFAULT_SHOP_CONFIG };

function total(packId: string, accessoryQty = 0, override?: Partial<ShopConfig>) {
  const result = priceShopOrder({ ...config, ...override }, { packId, accessoryQty });
  if (!result.ok) throw new Error(`expected a price, got ${result.error}`);
  return result.value.amountCents;
}

function error(packId: unknown, accessoryQty: unknown, override?: Partial<ShopConfig>) {
  const result = priceShopOrder({ ...config, ...override }, { packId, accessoryQty });
  if (result.ok) throw new Error('expected a rejection');
  return result.error;
}

describe('priceShopOrder — the locked prices', () => {
  it('charges 19.99 for a single tracker', () => {
    expect(total('tag_1')).toBe(1999);
  });

  it('charges 37.99 for the 2-pack', () => {
    expect(total('tag_2')).toBe(3799);
  });

  it('charges 71.99 for the 4-pack', () => {
    expect(total('tag_4')).toBe(7199);
  });

  it('discounts more per unit as the pack grows', () => {
    const perUnit = (packId: string, units: number) => total(packId) / units;
    expect(perUnit('tag_2', 2)).toBeLessThan(perUnit('tag_1', 1));
    expect(perUnit('tag_4', 4)).toBeLessThan(perUnit('tag_2', 2));
  });
});

describe('priceShopOrder — the accessory', () => {
  it('adds one euro per case', () => {
    expect(total('tag_1', 1)).toBe(2099);
    expect(total('tag_4', 4)).toBe(7599);
  });

  it('allows at most one case per tracker', () => {
    expect(total('tag_2', 2)).toBe(3999);
    expect(error('tag_2', 3)).toBe('invalid_accessory_qty');
  });

  it('rejects a negative quantity', () => {
    expect(error('tag_1', -1)).toBe('invalid_accessory_qty');
  });

  it('treats a non-integer quantity as none rather than charging a fraction', () => {
    expect(total('tag_2', 1.5)).toBe(3799);
  });

  it('refuses cases when the accessory is switched off', () => {
    expect(error('tag_2', 1, { accessoryEnabled: false })).toBe('accessory_unavailable');
  });

  it('still sells the tracker when the accessory is switched off', () => {
    expect(total('tag_2', 0, { accessoryEnabled: false })).toBe(3799);
  });
});

describe('priceShopOrder — rejections', () => {
  it('rejects an unknown pack', () => {
    expect(error('tag_9', 0)).toBe('invalid_pack');
  });

  it('rejects a missing pack id', () => {
    expect(error('', 0)).toBe('invalid_pack');
    expect(error(undefined, 0)).toBe('invalid_pack');
    expect(error(42, 0)).toBe('invalid_pack');
  });

  it('refuses to sell hardware for nothing', () => {
    expect(error('tag_1', 0, { packs: [{ id: 'tag_1', units: 1, priceCents: 0 }] })).toBe(
      'zero_total'
    );
  });
});

describe('priceShopOrder — shipping is additive', () => {
  it('adds a delivery fee once per order, not per unit', () => {
    expect(total('tag_4', 0, { shippingCents: 499 })).toBe(7199 + 499);
    expect(total('tag_4', 4, { shippingCents: 499 })).toBe(7199 + 400 + 499);
  });

  it('reports the fee separately so it can be invoiced as its own line', () => {
    const result = priceShopOrder({ ...config, shippingCents: 499 }, {
      packId: 'tag_2',
      accessoryQty: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.packPriceCents).toBe(3799);
    expect(result.value.accessoryUnitPriceCents).toBe(100);
    expect(result.value.shippingCents).toBe(499);
    expect(result.value.amountCents).toBe(3799 + 100 + 499);
  });
});

describe('product copy', () => {
  /**
   * The device is a Bluetooth tracker on the Apple Find My and Google Find Hub
   * networks. Calling it GPS is inaccurate, and AirTag is Apple's trademark.
   * Neither word may reach a customer in any language.
   */
  const forbidden = /\bGPS\b|AirTag/i;
  const messagesDir = join(process.cwd(), 'messages');

  for (const file of readdirSync(messagesDir).filter((f) => f.endsWith('.json'))) {
    it(`${file} never says GPS or AirTag`, () => {
      const raw = readFileSync(join(messagesDir, file), 'utf8');
      expect(forbidden.test(raw)).toBe(false);
    });

    it(`${file} carries the full shop and terms copy`, () => {
      const en = JSON.parse(readFileSync(join(messagesDir, 'en.json'), 'utf8'));
      const other = JSON.parse(readFileSync(join(messagesDir, file), 'utf8'));
      for (const namespace of ['shop', 'terms'] as const) {
        expect(Object.keys(other[namespace] ?? {}).sort()).toEqual(
          Object.keys(en[namespace]).sort()
        );
      }
      expect(typeof other.nav?.shop).toBe('string');
    });
  }
});
