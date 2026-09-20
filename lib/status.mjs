/**
 * The verification vocabulary, in one place.
 *
 * Colour now carries the verdict, so this map is the single source of truth for
 * mark tints, card badges, legend swatches and filter chips. Anything that
 * hard-codes a status colour elsewhere will drift the moment a status is added.
 *
 * `derivable` has zero items in the current run but is part of the contract, so
 * it is defined here and must survive untouched until the backend emits it.
 */
export const STATUSES = {
  exact: {
    key: 'exact',
    label: 'Exact match',
    short: 'Exact',
    tone: 'green',
    bucket: 'confirmed',
    blurb: 'Value and context match the source document.',
    order: 1,
  },
  derivable: {
    key: 'derivable',
    label: 'Derivable match',
    short: 'Derivable',
    tone: 'blue',
    bucket: 'confirmed',
    blurb: 'Value equals a formula or sum of source numbers.',
    order: 2,
  },
  discrepancy: {
    key: 'discrepancy',
    label: 'Discrepancy',
    short: 'Discrepancy',
    tone: 'amber',
    bucket: 'review',
    blurb: 'Found in the source, but the numbers conflict.',
    order: 3,
  },
  unbacked: {
    key: 'unbacked',
    label: 'Unbacked',
    short: 'Unbacked',
    tone: 'red',
    bucket: 'action',
    blurb: 'No supporting passage found in the uploaded sources.',
    order: 4,
  },
  vintage_unclear: {
    key: 'vintage_unclear',
    label: 'Vintage unclear',
    short: 'Vintage',
    tone: 'slate',
    bucket: 'review',
    blurb: 'The source is silent on this period.',
    order: 5,
  },
  out_of_scope: {
    key: 'out_of_scope',
    label: 'Not in scope',
    short: 'Not in scope',
    tone: 'grey',
    bucket: 'scope',
    blurb: 'Nothing in the uploaded sources speaks to this figure.',
    order: 6,
  },
};

/**
 * A status the backend invents later must degrade, not crash. It renders in the
 * neutral tone and lands in the review bucket so it is seen rather than hidden.
 */
export const UNKNOWN_STATUS = {
  key: 'unknown',
  label: 'Unrecognised status',
  short: 'Unknown',
  tone: 'slate',
  bucket: 'review',
  blurb: 'This status is not known to the viewer.',
  order: 99,
};

export const statusOf = (key) => STATUSES[key] ?? { ...UNKNOWN_STATUS, key: key || 'unknown' };

/** Triage buckets for the review panel (decision 4 in task.md). */
export const BUCKETS = {
  action: { key: 'action', label: 'Needs Action', tone: 'red' },
  review: { key: 'review', label: 'Needs Review', tone: 'amber' },
  confirmed: { key: 'confirmed', label: 'Auto Confirmed', tone: 'green' },
  scope: { key: 'scope', label: 'Not in scope', tone: 'grey' },
};

export const bucketOf = (statusKey) => statusOf(statusKey).bucket;

/**
 * Statuses that represent a verification *outcome*. `out_of_scope` is excluded:
 * it means no attempt was made, and counting 63% of the document as an error
 * would bury the 251 items that genuinely need a human.
 */
export const IN_SCOPE = Object.values(STATUSES)
  .filter((s) => s.bucket !== 'scope')
  .map((s) => s.key);

/** Ordered for legends and chip rows. */
export const STATUS_ORDER = Object.values(STATUSES)
  .sort((a, b) => a.order - b.order)
  .map((s) => s.key);

/**
 * Severity — `circle_plan.md` §6.
 *
 * The verdict says *what* the engine found; severity says *how much it matters*.
 * Without this the screen reports 72 "External Mismatches" when only 27 are
 * genuine conflicts — the other 45 are the same figure measured on a different
 * date or a different basis, which is not the company misstating anything.
 *
 * Derived, never stored: a `root_cause` value the backend invents later (as
 * `period_mismatch` just did) degrades to medium instead of crashing.
 */
export const SEVERITIES = {
  high: {
    key: 'high', label: 'High', tone: 'red', order: 1,
    blurb: 'Either nothing in the sources supports it, or the numbers conflict with no explanation.',
  },
  medium: {
    key: 'medium', label: 'Medium', tone: 'amber', order: 2,
    blurb: 'The numbers differ for a stated reason — a different period, basis or vintage. Usually not a misstatement.',
  },
  resolved: {
    key: 'resolved', label: 'Auto-resolved', tone: 'green', order: 3,
    blurb: 'Within the rounding tolerance band. Recorded, not raised.',
  },
  none: { key: 'none', label: '', tone: 'grey', order: 4, blurb: '' },
};

export function severityOf(claim) {
  const bucket = bucketOf(claim.status);
  // Confirmed and out-of-scope claims are not findings, so they carry no severity.
  if (bucket === 'confirmed' || bucket === 'scope') return SEVERITIES.none;
  if (claim.status === 'vintage_unclear') return SEVERITIES.medium;
  const rc = claim.rootCause;
  // `unbacked` carries no root cause: nothing was found at all, which is the
  // most serious outcome, not the least.
  if (!rc) return SEVERITIES.high;
  if (rc === 'rounding') return SEVERITIES.resolved;
  if (rc === 'unexplained') return SEVERITIES.high;
  return SEVERITIES.medium;
}

/** True for findings a reviewer still has to act on. */
export const isOpenFinding = (claim) => {
  const sev = severityOf(claim);
  return sev.key === 'high' || sev.key === 'medium';
};
