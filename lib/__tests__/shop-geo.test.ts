/**
 * Tests for the shop's country restriction.
 *
 * A mistake here fails silently in one of two expensive directions: the shop
 * disappears for real customers in a country we ship to, or it is served to
 * visitors we cannot deliver to. Both are pinned below.
 */
import { describe, it, expect } from 'vitest';
import { COUNTRY_HEADER, isVisitorInShopCountry, visitorCountry } from '../shop-geo';

const SHIPS_TO = ['PT', 'ES', 'FR', 'IT'];

function headersWith(value?: string) {
  return new Headers(value === undefined ? {} : { [COUNTRY_HEADER]: value });
}

describe('visitorCountry', () => {
  it('reads the Vercel geo header', () => {
    expect(visitorCountry(headersWith('PT'))).toBe('PT');
  });

  it('normalises case and whitespace', () => {
    expect(visitorCountry(headersWith(' es '))).toBe('ES');
  });

  it('treats a missing or malformed header as unknown', () => {
    expect(visitorCountry(headersWith())).toBeNull();
    expect(visitorCountry(headersWith(''))).toBeNull();
    expect(visitorCountry(headersWith('PRT'))).toBeNull();
    expect(visitorCountry(headersWith('P1'))).toBeNull();
  });
});

describe('isVisitorInShopCountry, production', () => {
  const allowed = (country: string | null) =>
    isVisitorInShopCountry({
      shopCountries: SHIPS_TO,
      country,
      environment: 'production',
      headerExpected: true,
    });

  it('serves every country we ship to', () => {
    for (const cc of SHIPS_TO) expect(allowed(cc)).toBe(true);
  });

  it('refuses countries we do not ship to', () => {
    for (const cc of ['DE', 'GB', 'US', 'BR', 'NL']) expect(allowed(cc)).toBe(false);
  });

  it('refuses an unknown country on Vercel, where the header should always exist', () => {
    expect(allowed(null)).toBe(false);
  });

  it('follows the admin-edited list rather than a hardcoded one', () => {
    expect(
      isVisitorInShopCountry({
        shopCountries: ['PT'],
        country: 'ES',
        environment: 'production',
        headerExpected: true,
      })
    ).toBe(false);
  });

  it('refuses everyone when the list is empty', () => {
    expect(
      isVisitorInShopCountry({
        shopCountries: [],
        country: 'PT',
        environment: 'production',
        headerExpected: true,
      })
    ).toBe(false);
  });
});

describe('isVisitorInShopCountry, exemptions', () => {
  it('lets a QA tester through from anywhere', () => {
    expect(
      isVisitorInShopCountry({
        shopCountries: SHIPS_TO,
        country: 'US',
        environment: 'qa',
        headerExpected: true,
      })
    ).toBe(true);
  });

  it('allows local development, which never has the header', () => {
    expect(
      isVisitorInShopCountry({
        shopCountries: SHIPS_TO,
        country: null,
        environment: 'production',
        headerExpected: false,
      })
    ).toBe(true);
  });

  it('still refuses a known wrong country locally', () => {
    expect(
      isVisitorInShopCountry({
        shopCountries: SHIPS_TO,
        country: 'US',
        environment: 'production',
        headerExpected: false,
      })
    ).toBe(false);
  });
});
