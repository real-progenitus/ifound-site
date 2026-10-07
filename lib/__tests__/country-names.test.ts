import { describe, it, expect } from 'vitest';
import { formatCountryList } from '../country-names';

const SHOP = ['PT', 'ES', 'FR', 'IT'];

describe('formatCountryList', () => {
  it('names the countries in the page language, not in English', () => {
    expect(formatCountryList(SHOP, 'pt')).toBe('Portugal, Espanha, França e Itália');
    expect(formatCountryList(SHOP, 'es')).toBe('Portugal, España, Francia e Italia');
    expect(formatCountryList(SHOP, 'en')).toBe('Portugal, Spain, France, and Italy');
  });

  it('handles a single country without a conjunction', () => {
    expect(formatCountryList(['PT'], 'fr')).toBe('Portugal');
  });

  it('keeps a code it cannot name rather than failing', () => {
    expect(formatCountryList(['PT', '??'], 'en')).toBe('Portugal and ??');
  });
});
