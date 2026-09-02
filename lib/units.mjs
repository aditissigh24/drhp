/**
 * "Type of number" grouping for the check bar.
 *
 * The report spells one unit several ways — "₹ million", "₹ in million" and
 * "₹ millions" are the same thing, as are "beds", "Beds" and "licensed beds" —
 * so families are matched by pattern rather than by exact string. Order
 * matters: the first family that matches wins, and `count` is the catch-all.
 */
export const UNIT_FAMILIES = [
  { key: 'all', label: 'All types' },
  { key: 'pct', label: 'Percentages', test: (u) => /%|percent/i.test(u) },
  { key: 'money', label: 'Currency (₹)', test: (u) => /₹|\binr\b|\brs\.?\b/i.test(u) },
  { key: 'beds', label: 'Beds', test: (u) => /\bbeds?\b/i.test(u) },
  { key: 'hospitals', label: 'Hospitals', test: (u) => /hospital|centre|center|clinic/i.test(u) },
  { key: 'time', label: 'Years & periods', test: (u) => /year|month|day|fiscal|quarter/i.test(u) },
  { key: 'count', label: 'Counts & other', test: () => true },
  { key: 'claim', label: 'Qualitative claims' },
];

/**
 * Qualitative claims carry no value and no meaningful unit, so they get their
 * own family instead of being dumped into "counts" — 181 of 942 items would
 * otherwise make that bucket meaningless.
 */
export function unitFamily(claim) {
  if (claim.claimValue === null || claim.claimValue === undefined) return 'claim';
  const u = claim.unit || '';
  for (const f of UNIT_FAMILIES) {
    if (f.key === 'all' || f.key === 'claim') continue;
    if (f.test(u)) return f.key;
  }
  return 'count';
}
