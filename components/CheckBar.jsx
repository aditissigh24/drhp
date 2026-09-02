'use client';

import { UNIT_FAMILIES } from '@/lib/units.mjs';

/**
 * Check controls: which failures to look at, which kind of number, and how far
 * through the section the review is.
 *
 * The mock carries "Internal Mismatches" and "Math Failures" chips. Those
 * engines did not run in this pipeline, so they are rendered disabled and
 * labelled — not shown with a count of 0. In a tool whose output is evidence of
 * due diligence, "Math Failures 0" reads as "the maths was checked and passed",
 * which would be a false assurance. They light up automatically if the report
 * ever carries them.
 */
export default function CheckBar({
  filters, filter, setFilter, counts,
  unitFilter, setUnitFilter, unitCounts,
  completion,
}) {
  return (
    <div className="checkbar">
      <div className="checkchips">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`checkchip${filter === f.key ? ' on' : ''}${f.tone ? ` tone-${f.tone}` : ''}`}
            onClick={() => setFilter(f.key)}
            title={f.blurb}
          >
            {f.label} <span className="c">{counts[f.key] ?? 0}</span>
          </button>
        ))}
        <button className="checkchip off" disabled title="Internal consistency checking is not part of this run.">
          Internal Mismatches <span className="c">not run</span>
        </button>
        <button className="checkchip off" disabled title="Calculation verification is not part of this run.">
          Math Failures <span className="c">not run</span>
        </button>
      </div>

      <div className="checkright">
        <label className="typesel">
          <span>Type of number</span>
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            {UNIT_FAMILIES.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}{f.key === 'all' ? '' : ` (${unitCounts[f.key] ?? 0})`}
              </option>
            ))}
          </select>
        </label>

        <div className="completion" title={completion.blurb}>
          <div className="completion-lbl">Section verified</div>
          <div className="completion-row">
            <span className="pct">{completion.pct}%</span>
            <span className="bar"><span style={{ width: `${completion.pct}%` }} /></span>
            <span className="of">({completion.done} of {completion.total} in scope)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
