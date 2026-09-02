/**
 * Master Verification Chart export.
 *
 * Columns follow circle_plan.md §8A. Two of them cannot be filled from this
 * run and say so explicitly rather than being left blank: a blank "Math Check"
 * column in a due-diligence record reads as "checked, nothing found", which is
 * the opposite of the truth — no calculation engine ran here at all.
 */
import { statusOf } from './status.mjs';

const CSV_COLUMNS = [
  'DRHP Page',
  'DRHP Claim / Figure',
  'Metric',
  'Verification Status',
  'Root Cause',
  'DRHP Value',
  'Source Value',
  'Unit',
  'Period',
  'Basis',
  'Source Document',
  'Source Page(s)',
  'Explanation',
  'Math Check',
  'Located in Document',
  'Sign-off Timestamp',
  'Reviewer',
  'Claim ID',
];

/** RFC 4180: quote everything containing a comma, quote or newline. */
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

export function buildMvc(claims, anchors, review = {}) {
  const rows = [CSV_COLUMNS];
  for (const c of claims) {
    const a = anchors[c.id];
    const r = review[c.id] || {};
    rows.push([
      a?.page ?? c.page,
      c.rawText,
      c.metric,
      statusOf(c.status).label,
      (c.rootCause || '').replace(/_/g, ' '),
      c.claimValue,
      c.evidenceValue,
      c.unit,
      c.period,
      c.basis === 'unknown' ? '' : c.basis,
      c.sourceDocId || '',
      c.evidence.map((e) => e.page).join('; '),
      c.explanation || '',
      // No calculation-verification engine ran in this pipeline.
      'Not run',
      a ? (a.ambiguous ? 'Yes (position uncertain)' : 'Yes') : 'No',
      r.signedOffAt || '',
      r.reviewer || '',
      c.id,
    ]);
  }
  return toCsv(rows);
}

/** Trigger a client-side download. Static export: there is no server to hit. */
export function downloadCsv(filename, csv) {
  // The BOM makes Excel open UTF-8 correctly; without it ₹ arrives mangled.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
