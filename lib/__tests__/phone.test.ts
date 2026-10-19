import { describe, it, expect } from 'vitest';
import { DIAL_CODES, defaultPhoneCountry, flagEmoji, parsePhone, phoneCountryOptions } from '../phone';

describe('parsePhone', () => {
  it.each([
    ['PT', '912 345 678', '+351912345678', '+351 912345678'],
    ['PT', '(+351) 912-345-678', '+351912345678', '+351912345678'],
    ['GB', '07700 900123', '+447700900123', '+44 7700900123'],
    ['IT', '06 1234 5678', '+390612345678', '+39 0612345678'],
    ['US', '(415) 555-0123', '+14155550123', '+1 4155550123'],
    ['ES', '+44 7700 900123', '+447700900123', '+447700900123'],
    ['ES', '0044 7700 900123', '+447700900123', '+447700900123'],
  ])('%s + "%s" → %s', (country, input, e164, display) => {
    expect(parsePhone(country, input)).toEqual({ e164, display });
  });

  it.each([
    ['empty', 'PT', '   '],
    ['letters', 'PT', '91234abc'],
    ['too short', 'PT', '123'],
    ['too long', 'PT', '1234567890123456'],
    ['unknown country', 'ZZ', '912345678'],
    ['no country and no +', '', '912345678'],
    ['international too short', 'PT', '+351 12'],
    ['international starting with 0', 'PT', '+0123456789'],
  ])('rejects %s', (_label, country, input) => {
    expect(parsePhone(country, input)).toBeNull();
  });
});

describe('defaultPhoneCountry', () => {
  it('prefers the visitor country, then the page language, then Portugal', () => {
    expect(defaultPhoneCountry('BR', 'pt')).toBe('BR');
    expect(defaultPhoneCountry(null, 'de')).toBe('DE');
    expect(defaultPhoneCountry('ZZ', 'el')).toBe('GR');
    expect(defaultPhoneCountry(null, 'en')).toBe('PT');
    expect(defaultPhoneCountry(null, 'xx')).toBe('PT');
  });
});

describe('DIAL_CODES', () => {
  it('maps two-letter codes to 1–4 digit calling codes', () => {
    for (const [cc, code] of Object.entries(DIAL_CODES)) {
      expect(cc).toMatch(/^[A-Z]{2}$/);
      expect(code).toMatch(/^[1-9]\d{0,3}$/);
    }
    expect(DIAL_CODES.PT).toBe('351');
  });

  it('builds flag emoji from the code', () => {
    expect(flagEmoji('PT')).toBe('🇵🇹');
  });
});

describe('phoneCountryOptions', () => {
  it('lists every country once, named in the locale and sorted by that name', () => {
    const options = phoneCountryOptions('de');
    expect(options).toHaveLength(Object.keys(DIAL_CODES).length);
    expect(options.find((o) => o.cc === 'DE')).toEqual({ cc: 'DE', code: '49', name: 'Deutschland' });
    const names = options.map((o) => o.name);
    expect(names).toEqual([...names].sort(new Intl.Collator('de').compare));
  });
});
