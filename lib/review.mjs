/**
 * The audit trail — `circle_plan.md` §7 and §5's "Bind Source / Override".
 *
 * Stored in localStorage because there is no backend yet. Two rules make that
 * survivable:
 *
 *   1. Keyed by `runId` + `claimId`. `claim_id` is positional (`doc:page:index`)
 *      and is NOT stable across report versions — run 2 changed the claim count
 *      on 22 pages, so 551 of 900 shared ids came to mean a different claim.
 *      Keying on the run as well means a new report starts a clean namespace
 *      instead of silently reattaching someone's sign-off to the wrong figure.
 *   2. Every entry records who and when. A decision with no author is not an
 *      audit trail.
 *
 * Shaped as a tiny store so an API can replace the two functions untouched.
 */
const KEY = 'circleup.review.v1';
const REVIEWER_KEY = 'circleup.reviewer';

const canStore = () => typeof window !== 'undefined' && !!window.localStorage;

function readAll() {
  if (!canStore()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

/** Every decision recorded against one report run. */
export function loadReview(runId) {
  return readAll()[runId] || {};
}

export function saveDecision(runId, claimId, entry) {
  if (!canStore()) return {};
  const all = readAll();
  const run = { ...(all[runId] || {}) };
  if (entry === null) delete run[claimId];
  else run[claimId] = { ...entry, at: new Date().toISOString() };
  all[runId] = run;
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return run;
}

export const getReviewer = () =>
  (canStore() && window.localStorage.getItem(REVIEWER_KEY)) || '';

export const setReviewer = (name) => {
  if (canStore()) window.localStorage.setItem(REVIEWER_KEY, name);
};

/**
 * What a reviewer can decide. `override` demands a reason — that note is the
 * thing the audit trail exists to carry, so it is enforced, not encouraged.
 */
export const DECISIONS = {
  verified: {
    key: 'verified', label: 'Verified', tone: 'green',
    blurb: 'Checked against the source and accepted.', needsNote: false,
  },
  override: {
    key: 'override', label: 'Overridden', tone: 'blue',
    blurb: 'Accepted despite the engine flagging it. Reason required.', needsNote: true,
  },
  escalated: {
    key: 'escalated', label: 'Escalated', tone: 'red',
    blurb: 'Referred on — company, auditor or counsel to answer.', needsNote: true,
  },
};

export const decisionOf = (key) => DECISIONS[key] || null;
