const relativeTime = new Intl.RelativeTimeFormat("sr-Latn", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** „pre 3 dana“, „juče“, „pre 5 minuta“ */
export function timeAgo(iso: string, now = Date.now()) {
  const diffSeconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, seconds] of UNITS) {
    if (Math.abs(diffSeconds) >= seconds) return relativeTime.format(Math.round(diffSeconds / seconds), unit);
  }
  return "upravo sada";
}

/**
 * Srpska množina: [jednina, 2–4, ostalo], npr. ["prijava", "prijave", "prijava"].
 * 1, 21, 31… → jednina; 2–4, 22–24… → drugi oblik; 11–14 → treći oblik.
 */
export function plural(n: number, [one, few, many]: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
