'use client';

import { useEffect, useRef } from 'react';

const CATEGORY_LABEL = (s) => (s || '').replace(/_/g, ' ');

/** Show the context sentence with the marked span picked out. */
function Quote({ fact }) {
  const ctx = (fact.context_sentence || '').replace(/\s*\|\s*/g, '  ·  ').trim();
  const needle = (fact.raw_text || '').replace(/[*_`]/g, '').trim();
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


function Card({ fact, anchor, selected, dismissed, onSelect, onView, onDismiss }) {
  const ref = useRef(null);

  // Keep the selected card in sight when selection came from the document.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selected]);

  const shape = anchor?.shape ?? (fact.value == null ? 'underline' : 'circle');
  const unplaced = !anchor;

  return (
    <div
      ref={ref}
      className={`card${selected ? ' selected' : ''}${dismissed ? ' dismissed' : ''}`}
      onClick={() => onSelect(fact.id)}
    >
      <div className="card-top">
        <span className={`glyph ${shape}`} title={shape === 'circle' ? 'Circled up' : 'Underlined'}>
          {shape === 'circle' ? '' : ''}
        </span>
        <span className="val" title={fact.raw_text}>{fact.raw_text}</span>
        <span className="pageref">· Page {anchor?.page ?? fact.page_number}</span>
        {anchor?.ocr && (
          <span className="tag ocr" title="This text lives inside a figure, not the PDF's text layer. It was located by OCR — check the mark before relying on it.">
            in figure
          </span>
        )}
        {anchor?.groupSize > 1 && (
          <span className="tag" title="Several extractions describe this same span">
            ×{anchor.groupSize} here
          </span>
        )}
        {unplaced ? (
          <span className="tag warn">Not located</span>
        ) : anchor.ambiguous ? (
          <span className="tag warn">Check position</span>
        ) : (
          <span className="tag">{fact.source_attribution || CATEGORY_LABEL(fact.claim_category) || fact.extraction_type}</span>
        )}
      </div>

      <div className="metric">{fact.metric}</div>
      {(fact.entity || fact.period) && (
        <div className="sub">{[fact.entity, fact.period].filter(Boolean).join(' · ')}</div>
      )}

      <Quote fact={fact} />

      <div className="card-foot">
        <button
          className="linkbtn primary"
          disabled={unplaced}
          onClick={(e) => { e.stopPropagation(); onView(fact.id); }}
        >
          View in document
        </button>
        <button className="linkbtn" onClick={(e) => { e.stopPropagation(); onDismiss(fact.id); }}>
          {dismissed ? 'Restore' : 'Discard'}
        </button>
      </div>
    </div>
  );
}

export default function FactPanel({
  facts, anchors, counts, filter, setFilter, query, setQuery,
  selectedId, dismissed, onSelect, onView, onDismiss, placedCount, reviewCount,
}) {
  const chips = [
    ['all', 'All'],
    ['circle', 'Circled'],
    ['underline', 'Underlined'],
    ['review', 'Needs review'],
    ['crisil', 'CRISIL-sourced'],
  ];

  return (
    <aside className="panel">
      <div className="panel-head">
        <div className="tally">
          <div><span className="n">{placedCount}</span><span className="lbl">Circle-Ups</span></div>
          <div className="review"><span className="n">{reviewCount}</span><span className="lbl">Needs review</span></div>
        </div>

        <input
          className="search"
          placeholder="Search values, metrics, sentences…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="chips">
          {chips.map(([key, label]) => (
            <button
              key={key}
              className={`chip${filter === key ? ' on' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}<span className="c">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cards">
        {facts.length === 0 && <div className="empty">Nothing matches this filter.</div>}
        {facts.map((f) => (
          <Card
            key={f.id}
            fact={f}
            anchor={anchors[f.id]}
            selected={selectedId === f.id}
            dismissed={dismissed.has(f.id)}
            onSelect={onSelect}
            onView={onView}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </aside>
  );
}
