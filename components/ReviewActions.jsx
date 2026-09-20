'use client';

import { useState } from 'react';
import { DECISIONS, decisionOf } from '@/lib/review.mjs';

/**
 * Bind Source / Override / Escalate, with the mandatory reason note that makes
 * the record defensible (`circle_plan.md` §5, §7).
 *
 * Only rendered on the selected card — 953 cards each carrying a form would
 * bury the reading.
 */
export default function ReviewActions({ claim, decision, reviewer, onDecide, onClear }) {
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');

  const start = (key) => {
    setOpen(key);
    setNote(decision?.note || '');
    setSource(decision?.source || '');
  };

  const active = open ? DECISIONS[open] : null;
  // The note is the audit trail. Without it there is nothing to defend later,
  // so the control is disabled rather than the note being merely encouraged.
  const blocked = !!active?.needsNote && !note.trim();

  const commit = () => {
    onDecide(claim.id, {
      decision: open,
      note: note.trim(),
      source: source.trim(),
      reviewer: reviewer || 'unnamed',
    });
    setOpen(null);
  };

  const recorded = decision ? decisionOf(decision.decision) : null;

  return (
    <div className="review" onClick={(e) => e.stopPropagation()}>
      {recorded && (
        <div className={`recorded tone-${recorded.tone}`}>
          <span className="rec-label">{recorded.label}</span>
          {decision.source && <span className="rec-src">bound to: {decision.source}</span>}
          {decision.note && <p className="rec-note">“{decision.note}”</p>}
          <span className="rec-meta">
            {decision.reviewer} · {new Date(decision.at).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </span>
          <button className="linkbtn tiny" onClick={() => onClear(claim.id)}>Undo</button>
        </div>
      )}

      {!open && (
        <div className="review-actions">
          {Object.values(DECISIONS).map((d) => (
            <button
              key={d.key}
              className={`linkbtn act tone-${d.tone}`}
              title={d.blurb}
              onClick={() => start(d.key)}
            >
              {recorded?.key === d.key ? `Edit ${d.label.toLowerCase()}` : d.label}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="review-form">
          <div className="rf-head">
            {active.label}
            <span className="rf-blurb">{active.blurb}</span>
          </div>
          <input
            className="rf-input"
            placeholder="Bind source (optional) — document, page or clause you checked against"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <textarea
            className="rf-note"
            rows={2}
            placeholder={active.needsNote
              ? 'Reason (required) — this is what the audit trail carries'
              : 'Note (optional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="rf-foot">
            <button className="linkbtn primary" disabled={blocked} onClick={commit}>
              Record
            </button>
            <button className="linkbtn" onClick={() => setOpen(null)}>Cancel</button>
            {blocked && <span className="rf-warn">A reason is required.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
