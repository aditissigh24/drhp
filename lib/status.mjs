/**
 * The verification vocabulary, in one place.
 *
 * Colour now carries the verdict, so this map is the single source of truth for
 * mark tints, card badges, legend swatches and filter chips. Anything that
 * hard-codes a status colour elsewhere will drift the moment a status is added.
 *
 * This is the *internal consistency* vocabulary: every claim is checked against
 * the rest of the same document rather than against an outside source. The
 * three keys and their colours come straight from the report's own
 * `status`/`status_emoji` pair — 🔴 contradiction, 🟡 unique, 🟢 corroborated.
 *
 * `bucket` is a separate axis from `tone` on purpose. Tone is what the reader
 * sees; bucket is what the progress meter counts. `unique` is amber because the
 * report calls it amber, but it sits in `scope` because a figure stated once
 * has nothing to be checked against — counting 5,835 of those as outstanding
 * work would peg the bar at 33% and make it meaningless.
 */
export const STATUSES = {
  corroborated: {
    key: 'corroborated',
    label: 'Corroborated',
    short: 'Corroborated',
    tone: 'green',
    bucket: 'confirmed',
    blurb: 'Stated more than once in the document, and the values agree.',
    order: 1,
  },
  contradiction: {
    key: 'contradiction',
    label: 'Contradiction',
    short: 'Contradiction',
    tone: 'red',
    bucket: 'action',
    blurb: 'The document states this figure two different ways.',
    order: 2,
  },
  unique: {
    key: 'unique',
    label: 'Uncorroborated',
    short: 'Uncorroborated',
    tone: 'amber',
    bucket: 'scope',
    blurb: 'Stated only once, so there is nothing in the document to check it against.',
    order: 3,
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
  scope: { key: 'scope', label: 'Uncorroborated', tone: 'amber' },
};

export const bucketOf = (statusKey) => statusOf(statusKey).bucket;

/**
 * Statuses that represent a verification *outcome*. `unique` is excluded: no
 * check was possible, and counting 64% of the document as an error would bury
 * the 237 items that genuinely need a human.
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
  // Corroborated and uncorroborated claims are not findings, so they carry no
  // severity. That covers `unique`, which matters: it has no root cause, and
  // without this it would fall through to `high` and report 5,835 findings.
  if (bucket === 'confirmed' || bucket === 'scope') return SEVERITIES.none;
  const rc = claim.rootCause;
  // A contradiction carries no root cause in the internal-consistency report:
  // the document simply disagrees with itself, which is the serious outcome.
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
