/**
 * Tests for the shop's QA gating.
 *
 * This is security-relevant in both directions. Resolving to QA when it should
 * not would take a real buyer's order into a test collection with a test key,
 * so nothing ships. Resolving to production when a tester meant QA would charge
 * a real card. Only an exact "1" may mean QA.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveShopEnvironment,
  shopCollection,
  shopEnvironmentTag,
  SHOP_QA_COOKIE,
} from '../shop-env';

describe('resolveShopEnvironment', () => {
  it('resolves QA only for an exact "1"', () => {
    expect(resolveShopEnvironment('1')).toBe('qa');
  });

  it('defaults to production for anything else', () => {
    for (const value of [
      undefined,
      null,
      '',
      '0',
      'qa',
      'true',
      ' 1',
      '1 ',
      1,
      true,
      {},
      [],
    ]) {
      expect(resolveShopEnvironment(value)).toBe('production');
    }
  });
});

describe('shopCollection', () => {
  it('prefixes only in QA', () => {
    expect(shopCollection('ShopOrders', 'qa')).toBe('QA_ShopOrders');
    expect(shopCollection('ShopOrders', 'production')).toBe('ShopOrders');
    expect(shopCollection('Dynamic', 'qa')).toBe('QA_Dynamic');
    expect(shopCollection('Dynamic', 'production')).toBe('Dynamic');
  });
});

describe('shopEnvironmentTag', () => {
  /**
   * The cloud functions compare this against the environment their webhook
   * endpoint serves and ignore a mismatch, so the spelling has to be exact or
   * QA orders would silently never be fulfilled.
   */
  it('matches the tags the cloud functions compare against', () => {
    expect(shopEnvironmentTag('qa')).toBe('QA');
    expect(shopEnvironmentTag('production')).toBe('PROD');
  });
});

describe('the cookie name', () => {
  it('is stable, because a rename silently strands every tester in production', () => {
    expect(SHOP_QA_COOKIE).toBe('ifound-shop-qa');
  });
});
