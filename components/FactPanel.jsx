'use client';

import { useEffect, useRef } from 'react';
import { statusOf, severityOf } from '@/lib/status.mjs';
import Passage from './Evidence';
import ReviewActions from './ReviewActions';

const LABEL = (s) => (s || '').replace(/_/g, ' ');
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(+d) ? null : d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/** Show the context sentence with the marked span picked out. */
function Quote({ claim }) {
  const ctx = (claim.contextSentence || '')
    .replace(/<[^>]{1,16}>/g, ' ')
    .replace(/\s*\|\s*/g, '  ·  ')
    .replace(/\s+/g, ' ')
    .trim();
  const needle = (claim.rawText || '').replace(/[*_`]/g, '').trim();
  const at = needle ? ctx.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (at < 0) return <div className="quote">{ctx}</div>;
  return (
    <div className="quote">
      {ctx.slice(0, at)}
      <mark>{ctx.slice(at, at + needle.length)}</mark>
      {ctx.slice(at + needle.length)}
    </div>
  );
}

/**
 * The proof: what the DRHP says against what the source says, plus why the
 * engine reached its verdict. Only 106 of 942 claims carry an evidence
 * passage, so the explanation-only case is the norm, not a fallback.
 */
function Proof({ claim, expanded, onOpenSource }) {
  const st = statusOf(claim.status);
  const facing = claim.claimValue != null && claim.evidenceValue != null;

  return (
    <div className="proof">
      {facing && (
        <div className="facing">
          <div><span className="k">DRHP</span><span className="v">{claim.claimValue}</span></div>
          <div><span className="k">Source</span><span className="v alt">{claim.evidenceValue}</span></div>
          {claim.rootCause && <span className="cause">{LABEL(claim.rootCause)}</span>}
        </div>
      )}
      {claim.explanation
        ? <p className="why">{claim.explanation}</p>
        : <p className="why muted">{st.blurb}</p>}
      {/* Passages are long. Show them only for the card being worked on. */}
      {expanded && claim.evidence.map((e) => (
        <Passage key={e.evidenceId} e={e} onOpenSource={onOpenSource} />
      ))}
      {!expanded && claim.evidence.length > 0 && (
        <div className="passage-hint">
          {claim.evidence.length} supporting passage{claim.evidence.length > 1 ? 's' : ''} — select to read
        </div>
      )}
    </div>
  );
}

function Card({
  claim, anchor, index, selected, dismissed, generatedAt,
  onSelect, onView, onDismiss, onOpenSource,
  decision, reviewer, onDecide, onClearDecision,
}) {
  const ref = useRef(null);
  const st = statusOf(claim.status);

  // Keep the selected card in sight when selection came from the document.
  // Fires on mount too, which is what makes pagination-aware selection land.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selected]);

  const unplaced = !anchor;
  const extracted = fmtDate(generatedAt);
  const sev = severityOf(claim);

  return (
    <div
      ref={ref}
      className={`card tone-${st.tone}${selected ? ' selected' : ''}${dismissed ? ' dismissed' : ''}${decision ? ' decided' : ''}`}
      onClick={() => onSelect(claim.id)}
    >
      <div className="card-top">
        <span className="idx">{index}.</span>
        <span className="val" title={claim.rawText}>{claim.rawText}</span>
        {/* The primary verification gesture: jump to the page and look at the
            figure in context. Works for unplaced claims too — it lands on the
            page without a mark, and those are the ones that most need eyes. */}
        <button
          className="pageref"
          onClick={(e) => { e.stopPropagation(); onView(claim.id); }}
          title="Go to this page in the DRHP"
        >
          · Page {anchor?.page ?? claim.page}
          {anchor?.line ? ` · Line ${anchor.line}` : ''}
        </button>
        {sev.key !== 'none' && (
          <span className={`sev tone-${sev.tone}`} title={sev.blurb}>{sev.label}</span>
        )}
        <span className="tag status">{st.short}</span>
      </div>

      <div className="metric">{claim.metric}</div>

      <Quote claim={claim} />
      <Proof claim={claim} expanded={selected} onOpenSource={onOpenSource} />

      {/* Real provenance only. The mock shows a confidence score; the report
          carries none, and inventing one in an audit tool is not an option. */}
      <div className="card-meta">
        <span>Source: {claim.sourceDocId ? 'CRISIL Industry Report' : 'DRHP only'}</span>
        {claim.evidence.length > 0 && (
          <span>· p.{[...new Set(claim.evidence.map((e) => e.page))].join(', ')}</span>
        )}
        {claim.basis !== 'unknown' && <span>· {LABEL(claim.basis)}</span>}
        {claim.period && <span>· {claim.period}</span>}
        {extracted && <span>· Checked {extracted}</span>}
      </div>

      <div className="card-flags">
        {unplaced && <span className="tag warn">Not located</span>}
        {anchor?.ambiguous && <span className="tag warn">Check position</span>}
        {anchor?.ocr && (
          <span className="tag" title="This text lives inside a figure, not the PDF's text layer. It was located by OCR — check the mark before relying on it.">
            in figure
          </span>
        )}
        {anchor?.groupSize > 1 && (
          <span className="tag" title="Several extractions describe this same span">
            ×{anchor.groupSize} here
          </span>
        )}
        {claim.unit && <span className="tag">{claim.unit}</span>}
      </div>

      {selected && (
        <ReviewActions
          claim={claim}
          decision={decision}
          reviewer={reviewer}
          onDecide={onDecide}
          onClear={onClearDecision}
        />
      )}

      <div className="card-foot">
        <button
          className="linkbtn primary"
          onClick={(e) => { e.stopPropagation(); onView(claim.id); }}
        >
          View in document ↗
        </button>
        <button className="linkbtn" onClick={(e) => { e.stopPropagation(); onDismiss(claim.id); }}>
          {dismissed ? 'Restore' : 'Discard'}
        </button>
      </div>
    </div>
  );
}

/**
 * Page list showing up to `max` numbers: always the first and last, plus a
 * window that slides around the current page. With 48 list pages a reader
 * jumping around needs more than three targets to aim at.
 */
function pageList(current, total, max = 10) {
  if (total <= max) return [...Array(total).keys()];
  const out = new Set([0, total - 1, current]);
  for (let step = 1; out.size < max; step++) {
    const lo = current - step;
    const hi = current + step;
    if (lo >= 0) out.add(lo);
    if (out.size < max && hi < total) out.add(hi);
    if (lo < 0 && hi >= total) break;
  }
  const sorted = [...out].filter((p) => p >= 0 && p < total).sort((a, b) => a - b);
  const withGaps = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i && sorted[i] - sorted[i - 1] > 1) withGaps.push('…');
    withGaps.push(sorted[i]);
  }
  return withGaps;
}

export default function FactPanel({
  claims, anchors, query, setQuery, sort, setSort, sorts,
  selectedId, dismissed, onSelect, onView, onDismiss, onOpenSource,
  tallies, totalClaims, listPage, setListPage, pageSize, generatedAt,
  review, reviewer, onDecide, onClearDecision,
}) {
  const total = claims.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(listPage, pages - 1);
  const from = page * pageSize;
  const shown = claims.slice(from, from + pageSize);

  return (
    <aside className="panel">
      <div className="panel-head">
        <div className="panel-headrow">
          <div className="panel-title">
            Review Panel <span className="n">{total}</span>
          </div>
          <label className="sortsel">
            <span>Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <div className="pills">
          <span className="pill tone-red"><b>{tallies.action}</b> Needs Action</span>
          <span className="pill tone-amber"><b>{tallies.review}</b> Needs Review</span>
          <span className="pill tone-green"><b>{tallies.confirmed}</b> Auto Confirmed</span>
        </div>

        <input
          className="search"
          placeholder="Search values, metrics, sentences…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="cards">
        {total === 0 && <div className="empty">Nothing matches this filter.</div>}
        {shown.map((c, i) => (
          <Card
            key={c.id}
            claim={c}
            anchor={anchors[c.id]}
            index={from + i + 1}
            selected={selectedId === c.id}
            dismissed={dismissed.has(c.id)}
            generatedAt={generatedAt}
            onSelect={onSelect}
            onView={onView}
            onDismiss={onDismiss}
            onOpenSource={onOpenSource}
            decision={review[c.id]}
            reviewer={reviewer}
            onDecide={onDecide}
            onClearDecision={onClearDecision}
          />
        ))}
      </div>

      {total > 0 && (
        <div className="pager">
          <button
            className="pagebtn" disabled={page === 0}
            onClick={() => setListPage(page - 1)}
            aria-label="Previous page"
          >‹</button>
          {pageList(page, pages).map((p, i) => (p === '…' ? (
            <span className="gap" key={`g${i}`}>…</span>
          ) : (
            <button
              key={p}
              className={`pagebtn${p === page ? ' on' : ''}`}
              onClick={() => setListPage(p)}
            >{p + 1}</button>
          )))}
          <button
            className="pagebtn" disabled={page >= pages - 1}
            onClick={() => setListPage(page + 1)}
            aria-label="Next page"
          >›</button>
          <span className="showing">
            Showing {from + 1}–{Math.min(from + pageSize, total)} of {total}
          </span>
        </div>
      )}
    </aside>
  );
}
