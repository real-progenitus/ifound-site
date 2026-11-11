/**
 * Tests for the shop's country restriction.
 *
 * A mistake here fails silently in one of two expensive directions: the shop
 * disappears for real customers in a country we ship to, or it is served to
 * visitors we cannot deliver to. Both are pinned below.
 */
import { describe, it, expect } from 'vitest';
import { COUNTRY_HEADER, isGoogleCrawler, isVisitorInShopCountry, mayViewShop, visitorCountry } from '../shop-geo';

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

describe('Google crawlers (fetch from the US)', () => {
  // Real user agents, as Google documents them.
  const GOOGLE_UAS = [
    'AdsBot-Google (+http://www.google.com/adsbot.html)',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)',
    'Mozilla/5.0 (X11; Linux x86_64; Storebot-Google/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  ];
  const BROWSER_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

  const view = (country: string | null, userAgent: string | null) =>
    mayViewShop({
      shopCountries: SHIPS_TO,
      country,
      environment: 'production',
      headerExpected: true,
      userAgent,
    });

  it('recognises every Google crawler', () => {
    for (const ua of GOOGLE_UAS) expect(isGoogleCrawler(ua)).toBe(true);
  });

  it('does not take browsers or other bots for Google', () => {
    expect(isGoogleCrawler(BROWSER_UA)).toBe(false);
    expect(isGoogleCrawler('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(false);
    expect(isGoogleCrawler('')).toBe(false);
    expect(isGoogleCrawler(null)).toBe(false);
  });

  it('shows the shop page to Google from the US', () => {
    for (const ua of GOOGLE_UAS) expect(view('US', ua)).toBe(true);
  });

  it('still 404s an ordinary visitor from the US', () => {
    expect(view('US', BROWSER_UA)).toBe(false);
    expect(view('US', null)).toBe(false);
  });

  it('leaves visitors in a shipping country unaffected', () => {
    expect(view('PT', BROWSER_UA)).toBe(true);
  });

  it('never widens the checkout rule', () => {
    // The checkout route calls isVisitorInShopCountry, which has no user-agent
    // input at all, so a spoofed crawler UA cannot buy from outside the list.
    expect(
      isVisitorInShopCountry({
        shopCountries: SHIPS_TO,
        country: 'US',
        environment: 'production',
        headerExpected: true,
      }),
    ).toBe(false);
  });
});
