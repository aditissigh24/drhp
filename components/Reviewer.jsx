'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageView from './PageView';
import FactPanel from './FactPanel';
import CheckBar from './CheckBar';
import ModusLogo from './ModusLogo';
import SourcePeek from './SourcePeek';
import { STATUS_ORDER, statusOf, bucketOf } from '@/lib/status.mjs';
import { unitFamily } from '@/lib/units.mjs';
import { buildMvc, downloadCsv } from '@/lib/export.mjs';

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const PAGE_SIZE = 20;

/**
 * Sorting hoists a triage bucket to the top rather than filtering to it — the
 * reviewer still needs to see what else sits on the page they are working.
 * Within a bucket, document order is preserved so the list tracks the PDF.
 */
const SORTS = [
  { key: 'document', label: 'Document order' },
  { key: 'action', label: 'Needs Action first' },
  { key: 'review', label: 'Needs Review first' },
  { key: 'confirmed', label: 'Auto Confirmed first' },
];

/**
 * The filters the report can actually answer. Derived from the verification
 * vocabulary rather than hard-coded, so a status the backend adds later gets a
 * chip without anyone editing this list.
 */
const FILTERS = [
  { key: 'errors', label: 'All Errors', tone: 'red', statuses: ['discrepancy', 'unbacked', 'vintage_unclear'], blurb: 'Everything the engine could not confirm.' },
  { key: 'discrepancy', label: 'External Mismatches', tone: 'amber', statuses: ['discrepancy'], blurb: 'Found in the CRISIL report, but the numbers conflict.' },
  { key: 'unbacked', label: 'Unbacked Claims', tone: 'red', statuses: ['unbacked'], blurb: 'No supporting passage found in the uploaded sources.' },
  { key: 'vintage_unclear', label: 'Vintage Unclear', tone: 'slate', statuses: ['vintage_unclear'], blurb: 'The source is silent on this period.' },
  { key: 'confirmed', label: 'Auto Confirmed', tone: 'green', statuses: ['exact', 'derivable'], blurb: 'Value and context match the source.' },
  { key: 'out_of_scope', label: 'Not in scope', tone: 'grey', statuses: ['out_of_scope'], blurb: 'Nothing in the uploaded sources speaks to this figure.' },
  { key: 'human', label: 'Needs human review', tone: 'amber', statuses: null, blurb: "The engine's own triage flag, not our derivation from status." },
  { key: 'unplaced', label: 'Not located', statuses: null, blurb: 'The matcher could not anchor this claim to the page.' },
  { key: 'all', label: 'All claims', statuses: null, blurb: 'Every claim in the report.' },
];

/** What each colour means. Lives above the document so it costs the cards no height. */
function Legend() {
  return (
    <div className="legend" role="list">
      {STATUS_ORDER.map((key) => {
        const s = statusOf(key);
        return (
          <span className={`legend-item tone-${s.tone}`} role="listitem" key={key} title={s.blurb}>
            {s.short}
          </span>
        );
      })}
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
  const [unitFilter, setUnitFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('document');
  const [listPage, setListPage] = useState(0);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(null);
  const [peek, setPeek] = useState(null);

  const docRef = useRef(null);
  const pageEls = useRef(new Map());

  // ── load verification report + document ────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [v, a] = await Promise.all([
          fetch('/verification.json').then((r) => r.json()),
          fetch('/anchors.json').then((r) => r.json()),
        ]);
        if (!alive) return;
        setData({
          claims: v.claims, pages: v.pages, meta: v,
          anchors: a.anchors, groups: a.groups, stats: a.stats,
        });
        setCurrentPage(v.pages[0]);

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

  // ── filtering ──────────────────────────────────────────────────────────
  const matches = useCallback((c, key) => {
    if (key === 'all') return true;
    if (key === 'unplaced') return !data.anchors[c.id];
    if (key === 'human') return c.needsHumanReview;
    const f = FILTERS.find((x) => x.key === key);
    return f?.statuses ? f.statuses.includes(c.status) : true;
  }, [data]);

  const counts = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(
      FILTERS.map((f) => [f.key, data.claims.filter((c) => matches(c, f.key)).length]),
    );
  }, [data, matches]);

  const unitCounts = useMemo(() => {
    if (!data) return {};
    const out = { all: data.claims.length };
    for (const c of data.claims) {
      const k = unitFamily(c);
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const kept = data.claims.filter((c) => {
      if (!matches(c, filter)) return false;
      if (unitFilter !== 'all' && unitFamily(c) !== unitFilter) return false;
      if (!q) return true;
      return `${c.rawText} ${c.metric} ${c.entity} ${c.period} ${c.contextSentence}`
        .toLowerCase().includes(q);
    });
    if (sort === 'document') return kept;
    // Stable: only the chosen bucket moves, everything else holds its order.
    return kept
      .map((c, i) => ({ c, i }))
      .sort((a, b) => (bucketOf(a.c.status) === sort ? 0 : 1) - (bucketOf(b.c.status) === sort ? 0 : 1)
        || a.i - b.i)
      .map((x) => x.c);
  }, [data, filter, unitFilter, query, sort, matches]);

  const visibleIds = useMemo(() => new Set(visible.map((c) => c.id)), [visible]);

  // Changing what the list contains sends you back to its start.
  useEffect(() => { setListPage(0); }, [filter, unitFilter, query, sort]);

  /**
   * Pagination-aware selection (task D7).
   *
   * Clicking a mark on p251 selects a claim that may be #700 of 942 — on list
   * page 35. Without this the card is never rendered, so `scrollIntoView` finds
   * nothing and the click silently does nothing. Resolve the claim's page in
   * the *current* filtered order and go there; the card's own mount effect then
   * scrolls it to centre.
   *
   * Declared after the reset above so that when `selectFromDoc` clears a filter,
   * this still wins and lands on the right page rather than page 1.
   */
  useEffect(() => {
    if (!selectedId) return;
    const idx = visible.findIndex((c) => c.id === selectedId);
    if (idx < 0) return;
    const target = Math.floor(idx / PAGE_SIZE);
    setListPage((prev) => (prev === target ? prev : target));
  }, [selectedId, visible]);

  // Marks are never unmounted by a filter — a mark that vanishes takes its
  // click target with it, and the reader loses the ability to ask "what about
  // this one?" about a figure they can see on the page. Filtered-out marks fade
  // instead, and clicking one still resets the filter and selects its card.
  const groupsByPage = useMemo(() => {
    const by = new Map();
    if (!data) return by;
    for (const g of data.groups) {
      // A mark only disappears once every claim behind it has been discarded.
      const live = g.claimIds.filter((id) => !dismissed.has(id));
      if (!live.length) continue;
      if (!by.has(g.page)) by.set(g.page, []);
      by.get(g.page).push({
        ...g,
        claimIds: live,
        dimmed: !live.some((id) => visibleIds.has(id)),
      });
    }
    return by;
  }, [data, dismissed, visibleIds]);

  const tallies = useMemo(() => {
    if (!data) return { action: 0, review: 0, confirmed: 0 };
    const live = data.claims.filter((c) => !dismissed.has(c.id));
    const n = (b) => live.filter((c) => bucketOf(c.status) === b).length;
    return { action: n('action'), review: n('review'), confirmed: n('confirmed') };
  }, [data, dismissed]);

  /**
   * Progress through the *checkable* part of the section. Out-of-scope claims
   * are excluded from both sides: counting 591 unverifiable figures as
   * outstanding work would make the bar permanently red and meaningless.
   */
  const completion = useMemo(() => {
    if (!data) return { pct: 0, done: 0, total: 0, blurb: '' };
    const inScope = data.claims.filter((c) => bucketOf(c.status) !== 'scope');
    const done = inScope.filter((c) => bucketOf(c.status) === 'confirmed' || dismissed.has(c.id)).length;
    const total = inScope.length;
    return {
      pct: total ? Math.round((done / total) * 100) : 0,
      done,
      total,
      blurb: `${done} of ${total} checkable claims are confirmed or cleared. `
        + `${data.claims.length - total} more are out of scope for the uploaded sources.`,
    };
  }, [data, dismissed]);

  // ── navigation ─────────────────────────────────────────────────────────
  const scrollToPage = useCallback((page, offsetPts = 0) => {
    const el = pageEls.current.get(page);
    const pane = docRef.current;
    if (!el || !pane) return;
    const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top
      + pane.scrollTop + offsetPts * scale - pane.clientHeight * 0.32;
    pane.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [scale]);

  // Works for unplaced claims too: no mark to aim at, so land on the page and
  // let the reader find it. Those are the claims that most need human eyes.
  const viewInDocument = useCallback((id) => {
    const c = data?.claims.find((x) => x.id === id);
    if (!c) return;
    const a = data.anchors[id];
    setSelectedId(id);
    scrollToPage(a?.page ?? c.page, a ? a.rects[0].y : 0);
  }, [data, scrollToPage]);

  // Selecting from the document must not leave the card hidden behind a filter.
  const selectFromDoc = useCallback((id) => {
    setSelectedId(id);
    const claim = data?.claims.find((c) => c.id === id);
    if (!claim) return;
    if (!matches(claim, filter)) setFilter('all');
    if (unitFilter !== 'all' && unitFamily(claim) !== unitFilter) setUnitFilter('all');
    if (query && !`${claim.rawText} ${claim.metric}`.toLowerCase().includes(query.toLowerCase())) {
      setQuery('');
    }
  }, [data, filter, unitFilter, query, matches]);

  // The CRISIL PDF loads on first open, never at boot (task E6).
  const onOpenSource = useCallback((evidence) => setPeek(evidence), []);

  // Clicking bare page (not a mark) drops focus and brings every mark back to
  // full strength. Marks stopPropagation, so only background clicks land here.
  const clearFocus = useCallback(() => setSelectedId(null), []);

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

  const exportMvc = useCallback(() => {
    if (!data) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `master-verification-chart_${data.meta.docId}_${stamp}.csv`,
      buildMvc(data.claims, data.anchors),
    );
  }, [data]);

  if (error) return <div className="loading">Could not load: {error}</div>;
  if (!data) return <div className="loading">Loading verification report…</div>;

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

        <button className="btn primary" onClick={exportMvc}>
          Export Master Verification Chart
        </button>
        <span className="avatar" title="Signed in (demo)">MS</span>
      </header>

      <CheckBar
        filters={FILTERS}
        filter={filter}
        setFilter={setFilter}
        counts={counts}
        unitFilter={unitFilter}
        setUnitFilter={setUnitFilter}
        unitCounts={unitCounts}
        completion={completion}
      />

      <div className="main">
        {/* Legend and view controls sit over the document they act on, not in
            the global bar — they are about the rendering, not the deal. */}
        <div className="doccol">
          <div className="doctools">
            <Legend />

            <span className="divider" aria-hidden="true" />

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
          </div>

          <div className="docpane" ref={docRef} onScroll={onScroll} onClick={clearFocus}>
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
        </div>

        <FactPanel
          claims={visible}
          anchors={data.anchors}
          selectedId={selectedId}
          dismissed={dismissed}
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          sorts={SORTS}
          listPage={listPage}
          setListPage={setListPage}
          pageSize={PAGE_SIZE}
          generatedAt={data.meta.generatedAt}
          onSelect={viewInDocument}
          onView={viewInDocument}
          onDismiss={onDismiss}
          onOpenSource={data.meta.sourcePdf ? onOpenSource : undefined}
          tallies={tallies}
          totalClaims={data.claims.length}
        />

        {peek && (
          <SourcePeek
            evidence={peek}
            sourcePdf={data.meta.sourcePdf}
            onClose={() => setPeek(null)}
          />
        )}
      </div>
    </div>
  );
}
