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
