/**
 * The shop countries as a sentence in the visitor's language, e.g.
 * "Portugal, Espanha, França e Itália" on /pt and "Portugal, Spain, France and
 * Italy" on /en.
 *
 * Falls back step by step rather than failing: an unknown code keeps its code,
 * and a runtime without Intl.ListFormat gets a plain comma-separated list.
 */
export function formatCountryList(codes: string[], locale: string): string {
  let names = codes;
  try {
    const regionNames = new Intl.DisplayNames([locale], { type: 'region' });
    names = codes.map((cc) => {
      try {
        return regionNames.of(cc) ?? cc;
      } catch {
        return cc;
      }
    });
  } catch {
    /* keep the codes */
  }
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
  } catch {
    return names.join(', ');
  }
}
