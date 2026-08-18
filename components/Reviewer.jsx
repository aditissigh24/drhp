'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageView from './PageView';
import FactPanel from './FactPanel';
import ModusLogo from './ModusLogo';

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;


/** What each mark means. Lives in the top bar so it costs the cards no height. */
function Legend() {
  return (
    <div className="legend" role="list">
      <span className="legend-item" role="listitem" title="Circled: the fact carries a numeric value.">
        <svg viewBox="0 0 30 14" aria-hidden="true"><ellipse className="ink circle" cx="15" cy="7" rx="12.5" ry="5.2" /></svg>
        number
      </span>
      <span className="legend-item" role="listitem" title="Underlined: a qualitative claim with no numeric value.">
        <svg viewBox="0 0 30 14" aria-hidden="true"><path className="ink underline" d="M3 10 Q15 12 27 9.5" /></svg>
        claim
      </span>
      <span className="legend-item" role="listitem" title="Dashed: the matcher is not certain this is the right occurrence on the page. Verify before relying on it.">
        <svg viewBox="0 0 30 14" aria-hidden="true"><ellipse className="ink circle dash" cx="15" cy="7" rx="12.5" ry="5.2" /></svg>
        position uncertain
      </span>
    </div>
  );
}

export default function Reviewer() {
  const [data, setData] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(null);

  const [scale, setScale] = useState(1.3);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dismissed, setDismissed] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(null);

  const docRef = useRef(null);
  const pageEls = useRef(new Map());

  // ── load extraction + document ─────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [f, a] = await Promise.all([
          fetch('/facts.json').then((r) => r.json()),
          fetch('/anchors.json').then((r) => r.json()),
        ]);
        if (!alive) return;
        setData({ facts: f.facts, pages: f.pages, anchors: a.anchors, groups: a.groups, stats: a.stats });
        setCurrentPage(f.pages[0]);

        const pdfjs = await import('pdfjs-dist');
        // Served as .js, not .mjs: some CDNs hand back a MIME type for .mjs
        // that browsers refuse to load as a module worker.
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const doc = await pdfjs.getDocument({ url: '/drhp.pdf' }).promise;
        if (alive) setPdf(doc);
      } catch (e) {
        if (alive) setError(e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  const registerRef = useCallback((n, el) => {
    if (el) pageEls.current.set(n, el);
    else pageEls.current.delete(n);
  }, []);

  // ── derived collections ────────────────────────────────────────────────
  const groupsByPage = useMemo(() => {
    const by = new Map();
    if (!data) return by;
    for (const g of data.groups) {
      // A mark only disappears once every fact behind it has been discarded.
      const live = g.factIds.filter((id) => !dismissed.has(id));
      if (!live.length) continue;
      if (!by.has(g.page)) by.set(g.page, []);
      by.get(g.page).push({ ...g, factIds: live });
    }
    return by;
  }, [data, dismissed]);

  const matches = useCallback((f, key) => {
    const a = data.anchors[f.id];
    switch (key) {
      case 'circle': return a ? a.shape === 'circle' : f.value != null;
      case 'underline': return a ? a.shape === 'underline' : f.value == null;
      case 'review': return !a || a.ambiguous;
      case 'crisil': return /crisil/i.test(f.source_attribution || '');
      default: return true;
    }
  }, [data]);

  const counts = useMemo(() => {
    if (!data) return {};
    const keys = ['all', 'circle', 'underline', 'review', 'crisil'];
    return Object.fromEntries(keys.map((k) => [k, data.facts.filter((f) => matches(f, k)).length]));
  }, [data, matches]);

  const visible = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.facts.filter((f) => {
      if (!matches(f, filter)) return false;
      if (!q) return true;
      return `${f.raw_text} ${f.metric} ${f.entity} ${f.period} ${f.context_sentence}`
        .toLowerCase().includes(q);
    });
  }, [data, filter, query, matches]);

  const placedCount = data
    ? Object.keys(data.anchors).filter((id) => !dismissed.has(id)).length
    : 0;
  const reviewCount = data
    ? data.facts.filter((f) => !dismissed.has(f.id) && (!data.anchors[f.id] || data.anchors[f.id].ambiguous)).length
    : 0;

  // ── navigation ─────────────────────────────────────────────────────────
  const scrollToPage = useCallback((page, offsetPts = 0) => {
    const el = pageEls.current.get(page);
    const pane = docRef.current;
    if (!el || !pane) return;
    const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top
      + pane.scrollTop + offsetPts * scale - pane.clientHeight * 0.32;
    pane.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [scale]);

  const viewInDocument = useCallback((id) => {
    const a = data?.anchors[id];
    if (!a) return;
    setSelectedId(id);
    scrollToPage(a.page, a.rects[0].y);
  }, [data, scrollToPage]);

  // Selecting from the document must not leave the card hidden behind a filter.
  const selectFromDoc = useCallback((id) => {
    setSelectedId(id);
    const fact = data?.facts.find((f) => f.id === id);
    if (fact && !matches(fact, filter)) setFilter('all');
    if (query && fact && !`${fact.raw_text} ${fact.metric}`.toLowerCase().includes(query.toLowerCase())) {
      setQuery('');
    }
  }, [data, filter, query, matches]);

  const onDismiss = useCallback((id) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const onScroll = useCallback(() => {
    const pane = docRef.current;
    if (!pane) return;
    const top = pane.getBoundingClientRect().top;
    let best = null;
    for (const [n, el] of pageEls.current) {
      const dy = el.getBoundingClientRect().top - top;
      if (dy <= 90 && (!best || dy > best.dy)) best = { n, dy };
    }
    if (best) setCurrentPage(best.n);
  }, []);

  if (error) return <div className="loading">Could not load: {error}</div>;
  if (!data) return <div className="loading">Loading extraction…</div>;

  const firstPage = data.pages[0];
  const lastPage = data.pages[data.pages.length - 1];

  return (
    <div className="shell">
      <header className="topbar">
        <ModusLogo />
        <div className="brand">NSE - Due Diligence</div>
        <div className="crumb">
          <b>Manipal Health Enterprises Limited</b> · DRHP · Our Business · pages {firstPage}–{lastPage}
        </div>

        <div className="spacer" />

        <Legend />

        <div className="ctrl">
          <button onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - 0.15).toFixed(2)))} title="Zoom out">−</button>
          <span className="val">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + 0.15).toFixed(2)))} title="Zoom in">+</button>
        </div>

        <div className="pagebox">
          <input
            value={currentPage ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCurrentPage(n);
              if (data.pages.includes(n)) scrollToPage(n, 0);
            }}
          />
          <span>/ {lastPage}</span>
        </div>

        <a className="linkbtn" href="/drhp.pdf" download>Download</a>
      </header>

      <div className="main">
        <div className="docpane" ref={docRef} onScroll={onScroll}>
          <div className="pagestack">
            {data.pages.map((p) => (
              <PageView
                key={p}
                pdf={pdf}
                pageNum={p}
                scale={scale}
                groups={groupsByPage.get(p) || []}
                selectedId={selectedId}
                onSelect={selectFromDoc}
                registerRef={registerRef}
              />
            ))}
          </div>
        </div>

        <FactPanel
          facts={visible}
          anchors={data.anchors}
          counts={counts}
          filter={filter}
          setFilter={setFilter}
          query={query}
          setQuery={setQuery}
          selectedId={selectedId}
          dismissed={dismissed}
          onSelect={viewInDocument}
          onView={viewInDocument}
          onDismiss={onDismiss}
          placedCount={placedCount}
          reviewCount={reviewCount}
        />
      </div>
    </div>
  );
}
