'use client';

import { UNIT_FAMILIES } from '@/lib/units.mjs';

/**
 * Check controls: which failures to look at, which kind of number, and how far
 * through the section the review is.
 *
 * The mock also carried disabled "Internal Mismatches" and "Math Failures"
 * chips, marked "not run" so that a count of 0 could not be misread as "checked
 * and passed". This report *is* the internal-consistency run, so the first was
 * describing the thing it sat next to; both are gone rather than greyed out.
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
