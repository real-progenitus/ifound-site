/**
 * Phone numbers for the job application form: the country picker's data and
 * the one function that turns (country, what was typed) into an international
 * number. Shared by the form (instant feedback) and the server action (the
 * check that counts), so the two can't disagree.
 */

/** ISO 3166-1 alpha-2 → ITU calling code, without the "+". */
export const DIAL_CODES: Record<string, string> = {
  AD: '376', AE: '971', AF: '93', AG: '1268', AI: '1264', AL: '355', AM: '374', AO: '244',
  AR: '54', AS: '1684', AT: '43', AU: '61', AW: '297', AX: '358', AZ: '994',
  BA: '387', BB: '1246', BD: '880', BE: '32', BF: '226', BG: '359', BH: '973', BI: '257',
  BJ: '229', BL: '590', BM: '1441', BN: '673', BO: '591', BQ: '599', BR: '55', BS: '1242',
  BT: '975', BW: '267', BY: '375', BZ: '501',
  CA: '1', CC: '61', CD: '243', CF: '236', CG: '242', CH: '41', CI: '225', CK: '682',
  CL: '56', CM: '237', CN: '86', CO: '57', CR: '506', CU: '53', CV: '238', CW: '599',
  CX: '61', CY: '357', CZ: '420',
  DE: '49', DJ: '253', DK: '45', DM: '1767', DO: '1809', DZ: '213',
  EC: '593', EE: '372', EG: '20', EH: '212', ER: '291', ES: '34', ET: '251',
  FI: '358', FJ: '679', FK: '500', FM: '691', FO: '298', FR: '33',
  GA: '241', GB: '44', GD: '1473', GE: '995', GF: '594', GG: '44', GH: '233', GI: '350',
  GL: '299', GM: '220', GN: '224', GP: '590', GQ: '240', GR: '30', GT: '502', GU: '1671',
  GW: '245', GY: '592',
  HK: '852', HN: '504', HR: '385', HT: '509', HU: '36',
  ID: '62', IE: '353', IL: '972', IM: '44', IN: '91', IO: '246', IQ: '964', IR: '98',
  IS: '354', IT: '39',
  JE: '44', JM: '1876', JO: '962', JP: '81',
  KE: '254', KG: '996', KH: '855', KI: '686', KM: '269', KN: '1869', KP: '850', KR: '82',
  KW: '965', KY: '1345', KZ: '7',
  LA: '856', LB: '961', LC: '1758', LI: '423', LK: '94', LR: '231', LS: '266', LT: '370',
  LU: '352', LV: '371', LY: '218',
  MA: '212', MC: '377', MD: '373', ME: '382', MF: '590', MG: '261', MH: '692', MK: '389',
  ML: '223', MM: '95', MN: '976', MO: '853', MP: '1670', MQ: '596', MR: '222', MS: '1664',
  MT: '356', MU: '230', MV: '960', MW: '265', MX: '52', MY: '60', MZ: '258',
  NA: '264', NC: '687', NE: '227', NF: '672', NG: '234', NI: '505', NL: '31', NO: '47',
  NP: '977', NR: '674', NU: '683', NZ: '64',
  OM: '968',
  PA: '507', PE: '51', PF: '689', PG: '675', PH: '63', PK: '92', PL: '48', PM: '508',
  PR: '1787', PS: '970', PT: '351', PW: '680', PY: '595',
  QA: '974',
  RE: '262', RO: '40', RS: '381', RU: '7', RW: '250',
  SA: '966', SB: '677', SC: '248', SD: '249', SE: '46', SG: '65', SH: '290', SI: '386',
  SJ: '47', SK: '421', SL: '232', SM: '378', SN: '221', SO: '252', SR: '597', SS: '211',
  ST: '239', SV: '503', SX: '1721', SY: '963', SZ: '268',
  TC: '1649', TD: '235', TG: '228', TH: '66', TJ: '992', TK: '690', TL: '670', TM: '993',
  TN: '216', TO: '676', TR: '90', TT: '1868', TV: '688', TW: '886', TZ: '255',
  UA: '380', UG: '256', US: '1', UY: '598', UZ: '998',
  VA: '39', VC: '1784', VE: '58', VG: '1284', VI: '1340', VN: '84', VU: '678',
  WF: '681', WS: '685',
  XK: '383',
  YE: '967', YT: '262',
  ZA: '27', ZM: '260', ZW: '263',
};

/**
 * Picker default when the visitor's country is unknown (only off Vercel, which
 * always sends it): the country of the page's language. English falls back to
 * Portugal, where iFound is based.
 */
const LOCALE_COUNTRY: Record<string, string> = {
  en: 'PT', pt: 'PT', es: 'ES', fr: 'FR', it: 'IT', de: 'DE', hu: 'HU',
  el: 'GR', tr: 'TR', pl: 'PL', ro: 'RO', nl: 'NL',
};

export function defaultPhoneCountry(visitorCountry: string | null, locale: string): string {
  if (visitorCountry && DIAL_CODES[visitorCountry]) return visitorCountry;
  return LOCALE_COUNTRY[locale] ?? 'PT';
}

export interface PhoneCountryOption {
  cc: string;
  code: string;
  name: string;
}

/**
 * Every country with a calling code, named and sorted in the page's language.
 *
 * Built on the server and handed to the form as a prop, never in the browser:
 * Node and each browser ship their own ICU data, so the same Intl call can
 * name a country differently ("Turkey" / "Türkiye") or sort accents in
 * another order, and a list built on both sides fails hydration.
 */
export function phoneCountryOptions(locale: string): PhoneCountryOption[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    /* fall back to the codes */
  }
  const collator = new Intl.Collator(locale);
  return Object.entries(DIAL_CODES)
    .map(([cc, code]) => ({ cc, code, name: names?.of(cc) ?? cc }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** 🇵🇹 from "PT". Windows shows the two letters instead, which still reads fine. */
export function flagEmoji(country: string): string {
  return String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * In these countries a leading 0 is part of the number itself (Italian
 * landlines), not a domestic trunk prefix to drop when dialling from abroad.
 */
const KEEPS_LEADING_ZERO = new Set(['IT', 'SM', 'VA']);

export interface Phone {
  /** E.164, e.g. "+351912345678": what tel: and WhatsApp links need. */
  e164: string;
  /** For people: "+351 912345678". */
  display: string;
}

/**
 * Turn the picker's country plus whatever was typed into an international
 * number, or null if it can't be one.
 *
 * A number typed with "+" or "00" in front is taken as already international
 * and the picker is ignored, so a pasted or autofilled "+44 7700 900123" works
 * whatever country is selected. Otherwise the country's code is prefixed and a
 * domestic leading 0 dropped ("07700…" in the UK is "+44 7700…").
 *
 * Only the shape is checked (E.164 allows at most 15 digits); whether the
 * number exists is the recruiter's call to make.
 */
export function parsePhone(country: string, input: string): Phone | null {
  const cleaned = input.trim().replace(/[\s().\-/]/g, '');
  if (!cleaned) return null;

  const intl = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned.startsWith('00') ? cleaned.slice(2) : null;
  if (intl !== null) {
    if (!/^[1-9]\d{6,14}$/.test(intl)) return null;
    return { e164: `+${intl}`, display: `+${intl}` };
  }

  const code = DIAL_CODES[country];
  if (!code || !/^\d+$/.test(cleaned)) return null;
  const national = KEEPS_LEADING_ZERO.has(country) ? cleaned : cleaned.replace(/^0/, '');
  if (national.length < 4 || code.length + national.length > 15 || code.length + national.length < 7) {
    return null;
  }
  return { e164: `+${code}${national}`, display: `+${code} ${national}` };
}
