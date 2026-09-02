/**
 * textmatch — locates a fact's raw_text inside a PDF page's text layer and
 * returns geometry for the mark to draw over it.
 *
 * The core trick: match on a *whitespace-free* normalisation of the page.
 * Line wraps, double spaces, justified-text padding and OCR spacing noise all
 * disappear, while an index map lets us walk the match back to exact glyphs.
 */

// Characters the DRHP uses that differ from what the extractor recorded.
const CHAR_FOLD = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'",
  '“': '"', '”': '"', '„': '"',
  '‐': '-', '‑': '-', '‒': '-', '–': '-',
  '—': '-', '―': '-', '−': '-', '­': '',
  ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ',
  '➡': ' ', '→': ' ', '●': ' ', '•': ' ',
  'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl',
};

/**
 * Concatenate pdf.js text items into one string, keeping a per-character map
 * back to {item index, offset within that item's str}.
 */
export function buildPageText(items) {
  let raw = '';
  const map = [];
  items.forEach((it, i) => {
    const s = it.str || '';
    for (let o = 0; o < s.length; o++) {
      raw += s[o];
      map.push({ i, o });
    }
    if (it.hasEOL) {
      raw += '\n';
      map.push({ i, o: -1 }); // synthetic; never anchors a mark
    }
  });
  return { raw, map };
}

// Two matching tiers. `strict` only discards whitespace, so it preserves
// punctuation and is safe for short numeric queries. `loose` keeps just
// alphanumerics — it rescues infographic captions and table rows whose
// brackets, colons and pipes exist only in the extractor's markdown.
const KEEP_LOOSE = /[a-z0-9%₹]/;

const isDropped = (ch, mode) =>
  mode === 'loose' ? !KEEP_LOOSE.test(ch) : /\s/.test(ch);

// The extractor carries its own markup into raw_text and context_sentence —
// markdown emphasis ("on a *pro forma* basis") and HTML from table cells
// ("28.8<br>Karnataka: #4", "FY24<sup>(1)</sup>"). None of it exists in the
// PDF, and a literal "br" in the query is enough to lose the match entirely.
const stripMarkdown = (s) =>
  (s || '').replace(/<[^>]{1,16}>/g, ' ').replace(/[*_`]+/g, '');

/** Fold + lowercase + drop noise characters, keeping an index map. */
export function normalize(raw, mode = 'strict') {
  let norm = '';
  const idx = [];
  for (let i = 0; i < raw.length; i++) {
    const folded = CHAR_FOLD[raw[i]] ?? raw[i];
    for (const ch of folded.toLowerCase()) {
      if (isDropped(ch, mode)) continue;
      norm += ch;
      idx.push(i);
    }
  }
  return { norm, idx };
}

/** Same folding for a query string; no index map needed. */
export function normalizeQuery(s, mode = 'strict') {
  let out = '';
  for (const c of stripMarkdown(s)) {
    const folded = CHAR_FOLD[c] ?? c;
    for (const ch of folded.toLowerCase()) {
      if (isDropped(ch, mode)) continue;
      out += ch;
    }
  }
  return out;
}

/** Prepare a page once, reuse across all its facts. */
export function preparePage(items) {
  const { raw, map } = buildPageText(items);
  return {
    items,
    raw,
    map,
    strict: normalize(raw, 'strict'),
    loose: normalize(raw, 'loose'),
  };
}

const allIndexesOf = (hay, needle, from = 0, to = Infinity) => {
  const out = [];
  if (!needle) return out;
  let i = hay.indexOf(needle, from);
  while (i !== -1 && i + needle.length <= to) {
    out.push(i);
    i = hay.indexOf(needle, i + 1);
  }
  return out;
};

/** Split a markdown table row into its non-empty cells. */
function tableCells(context) {
  return context.split('|').map((c) => c.trim()).filter(Boolean);
}


/** A cell that reads as a figure rather than a label. */
const isNumericCell = (c) => /\d/.test(c) && /^[\s\d.,%()\-₹A-Za-z]{0,4}[\d.,%()\-₹]+[\s%)]*$/.test(c.trim());

/**
 * Resolve a table cell by its *position in the row*, not by hunting for its
 * value. The context sentence gives the cell order, so the target's ordinal
 * among the row's figures is known: in
 *   "| Columbia Asia | Fiscal 2022 | … | 21.59% | 27.41% | 31.95% |"
 * 27.41% is the 4th figure. We anchor the row label, then walk the figures
 * along that label's baseline in increasing-x order and take the 4th.
 *
 * The whole chain has to check out — every figure in the context must be found
 * on that baseline, left to right. A prose mention of "Columbia Asia" has no
 * such row beside it, so it is rejected instead of silently accepted, which is
 * exactly the failure this replaces. Returns null when it cannot prove the row,
 * leaving the older strategies to try.
 */
function tableOrdinal(cells, rawQ, targetCell, P, mode, N, q) {
  const label = cells.find((c) => !isNumericCell(c) && q(c).length > 2);
  if (!label) return null;

  const figures = cells.filter(isNumericCell);
  const targetIsFigure = targetCell >= 0 && isNumericCell(cells[targetCell]);
  if (!targetIsFigure || figures.length < 2) return null;
  const ordinal = cells.slice(0, targetCell).filter(isNumericCell).length;

  const labQ = q(label);
  for (const li of allIndexesOf(N.norm, labQ)) {
    const row = baselineAt(li, P, mode, N);
    if (!row) continue;
    const tol = Math.max(2, row.h * 0.5);

    // Walk the figures left to right, each strictly right of the previous.
    let x = row.x;
    let resolved = null;
    let complete = true;
    for (let k = 0; k < figures.length; k++) {
      const fq = q(figures[k]);
      const next = allIndexesOf(N.norm, fq)
        .map((h) => ({ h, g: baselineAt(h, P, mode, N) }))
        .filter((c) => c.g && Math.abs(c.g.y - row.y) <= tol && c.g.x > x)
        .sort((a, b) => a.g.x - b.g.x)[0];
      if (!next) { complete = false; break; }
      x = next.g.x;
      if (k === ordinal) resolved = next.h;
    }
    // Self-check here rather than at the top level: a failure must fall through
    // to the older strategies, not discard the fact.
    if (complete && resolved != null
        && N.norm.slice(resolved, resolved + rawQ.length) === rawQ
        && boundaryOk(P, N, resolved, resolved + rawQ.length, rawQ)) {
      return { start: resolved, end: resolved + rawQ.length, strategy: 'table-ordinal', ambiguous: false };
    }
  }
  return null;
}

/**
 * Last resort for table rows whose cells exist on the page but nowhere near
 * each other in reading order.
 *
 * Infographics — a bed-expansion bar chart, a regional map with callouts — are
 * emitted by the extractor as tidy markdown rows, but on the page the figures
 * float above their axis labels and the columns share no baseline. Adjacency
 * (table-row) and baseline walking (table-ordinal, table-line) both fail.
 *
 * So fall back to *spatial* corroboration: score each occurrence of the target
 * by how many of the row's other cells appear near it on the page, and demand
 * a clear winner. Two independent corroborating cells is the floor — one is
 * coincidence on a page dense with numbers.
 */
function tableProximity(cells, rawQ, targetCell, P, mode, N, q, targetHits) {
  const others = cells
    .filter((_, i) => i !== targetCell)
    .map((c) => q(c))
    .filter((t) => t.length >= 2);
  if (others.length < 2) return null;

  const candidates = targetHits(0, Infinity)
    .map((h) => ({ h, g: baselineAt(h, P, mode, N) }))
    .filter((c) => c.g);
  if (!candidates.length) return null;

  // Resolve each supporting cell's positions once, not per candidate.
  const support = others
    .map((t) => allIndexesOf(N.norm, t).map((o) => baselineAt(o, P, mode, N)).filter(Boolean))
    .filter((ps) => ps.length);
  if (support.length < 2) return null;

  const RADIUS = 180; // PDF points — roughly a quarter page, one chart cluster
  const scored = candidates.map(({ h, g }) => ({
    h,
    score: support.filter((ps) =>
      ps.some((p) => Math.hypot(p.x - g.x, p.y - g.y) <= RADIUS)).length,
  })).sort((a, b) => b.score - a.score);

  const [best, runnerUp] = scored;
  if (!best || best.score < 2) return null;
  // A tie means the page repeats the whole cluster; marking either is a guess.
  if (runnerUp && runnerUp.score === best.score) return null;
  return {
    start: best.h, end: best.h + rawQ.length,
    strategy: 'table-proximity', ambiguous: false,
  };
}

/**
 * Reject a match that starts or ends *inside* a longer token — "18" found in
 * the middle of "2,188", or "9" in "₹92,635.56". Normalised text can't tell
 * these apart because it has no spaces, so the test runs against the raw page
 * text where the real word boundaries survive.
 */
function boundaryOk(P, N, start, end, query) {
  const rawStart = N.idx[start];
  const rawEnd = N.idx[end - 1] + 1;
  if (rawStart == null || rawEnd == null) return false;

  const at = (i) => P.raw[i] ?? ' ';
  const before = at(rawStart - 1);
  const after = at(rawEnd);
  const digit = /[0-9]/;

  if (digit.test(query[0]) || digit.test(query[query.length - 1])) {
    if (digit.test(before) || digit.test(after)) return false;
    // A thousands separator or decimal point glued to more digits is the
    // same number continuing, not a neighbouring one.
    if ((before === ',' || before === '.') && digit.test(at(rawStart - 2))) return false;
    if ((after === ',' || after === '.') && digit.test(at(rawEnd + 1))) return false;
  }
  const letter = /[A-Za-z]/;
  if (letter.test(query[0]) && letter.test(before)) return false;
  if (letter.test(query[query.length - 1]) && letter.test(after)) return false;
  return true;
}

/** The text item sitting under a normalised index, for geometry lookups. */
function itemAt(normIndex, P, mode, N) {
  const rawIndex = (N ?? P[mode]).idx[normIndex];
  const m = rawIndex == null ? null : P.map[rawIndex];
  return m && m.o >= 0 ? P.items[m.i] : null;
}

const baselineAt = (i, P, mode, N) => {
  const it = itemAt(i, P, mode, N);
  return it ? { y: it.transform[5], h: it.height || 10, x: it.transform[4] } : null;
};

const xAt = (i, P, mode, N) => {
  const it = itemAt(i, P, mode, N);
  return it ? it.transform[4] : null;
};

/**
 * Locate a fact on a prepared page.
 * Returns { start, end, strategy, ambiguous } in *normalised* coordinates,
 * or null if the fact could not be placed.
 */
export function locate(fact, P, mode = 'strict') {
  const hit = locateSpan(fact, P, mode);
  // Last line of defence: offset arithmetic in the table strategies could put
  // the span somewhere that merely *neighbours* the value. If the resolved
  // characters aren't the query, we have no business drawing a mark there.
  if (!hit) return null;
  const q = normalizeQuery(fact.raw_text, mode);
  return P[mode].norm.slice(hit.start, hit.end) === q ? hit : null;
}

function locateSpan(fact, P, mode) {
  const N = P[mode];
  const q = (s) => normalizeQuery(s, mode);
  const rawQ = q(fact.raw_text);
  if (!rawQ) return null;
  const ctx = fact.context_sentence || '';
  // Any pipe means the extractor was reading a table, not a sentence.
  const isTableRow = ctx.includes('|');

  const targetHits = (from, to) =>
    allIndexesOf(N.norm, rawQ, from, to).filter((i) => boundaryOk(P, N, i, i + rawQ.length, rawQ));

  /**
   * `markAll` is for windows that are exactly one sentence. A DRHP routinely
   * states the same figure twice in a sentence — "we had 2,215 … licensed beds
   * (2,215 … on a pro forma basis)" — and both are the same claim, so both get
   * marked rather than the matcher picking one and flagging itself uncertain.
   * Fuzzier windows (a trimmed context, a table row's character span) keep the
   * first hit and stay flagged, because there every occurrence is a guess.
   */
  const withinCtx = (cs, ce, strategy, markAll = false) => {
    const hits = targetHits(cs, ce);
    if (hits.length === 0) return null;
    const spans = (markAll ? hits : [hits[0]]).map((h) => [h, h + rawQ.length]);
    return {
      start: hits[0],
      end: hits[0] + rawQ.length,
      strategy,
      // Marking every occurrence is not a guess, so it is not ambiguous.
      ambiguous: markAll ? false : hits.length > 1,
      spans,
      ctxStart: cs,
      ctxEnd: ce,
    };
  };

  // ---- Strategy 1: markdown table row -> cell sequence -------------------
  // "| Patiala | 80 | - |" never appears literally, but with whitespace
  // stripped the cells sit adjacent in the page's reading order: "patiala80-".
  if (isTableRow) {
    const cells = tableCells(ctx);
    // The target is usually a whole cell, but the extractor also emits rows
    // like "Metros | 28 Hospitals 5,579 Beds" where the value sits *inside*
    // one. Never let this come back -1 — a negative index silently anchors
    // the mark to the start of the row.
    let targetCell = cells.findIndex((c) => q(c) === rawQ);
    let offsetInCell = 0;
    if (targetCell < 0) {
      targetCell = cells.findIndex((c) => q(c).includes(rawQ));
      if (targetCell >= 0) offsetInCell = q(cells[targetCell]).indexOf(rawQ);
    }
    if (targetCell < 0) return null; // raw_text isn't in its own row: don't guess

    // Positional resolution first — it proves the row before marking anything.
    const byOrdinal = tableOrdinal(cells, rawQ, targetCell, P, mode, N, q);
    if (byOrdinal) return byOrdinal;

    for (let drop = 0; drop <= Math.max(0, cells.length - (targetCell + 1)); drop++) {
      const use = cells.slice(0, cells.length - drop);
      if (targetCell >= use.length) break;
      const joined = use.map((c) => q(c)).join('');
      const hits = allIndexesOf(N.norm, joined);
      if (hits.length >= 1) {
        const before = use.slice(0, targetCell).map((c) => q(c)).join('').length + offsetInCell;
        const start = hits[0] + before;
        if (!boundaryOk(P, N, start, start + rawQ.length, rawQ)) continue;
        return {
          start,
          end: start + rawQ.length,
          strategy: drop === 0 ? 'table-row' : `table-row-trim${drop}`,
          ambiguous: hits.length > 1,
          ctxStart: hits[0],
          ctxEnd: hits[0] + joined.length,
        };
      }
    }
    // Row didn't survive as a contiguous run — fall through to label anchoring.
    const label = cells.find((c) => !/^[\d.,%()\-₹\s]*$/.test(c));
    if (label) {
      const lab = q(label);
      const labelHits = allIndexesOf(N.norm, lab);
      for (const li of labelHits) {
        const hit = withinCtx(li, li + lab.length + 160, 'table-label');
        if (hit) return hit;
      }

      // Columns aren't adjacent in the content stream (common in wide tables):
      // fall back to geometry and take the cell sitting on the label's own row.
      for (const li of labelHits) {
        const row = baselineAt(li, P, mode, N);
        if (row == null) continue;
        for (const h of targetHits(0, Infinity)) {
          const cell = baselineAt(h, P, mode, N);
          if (!cell || Math.abs(cell.y - row.y) > Math.max(2, row.h * 0.5)) continue;
          if (cell.x < row.x) continue; // value sits to the right of its label
          return {
            start: h, end: h + rawQ.length,
            strategy: 'table-line', ambiguous: false,
          };
        }
      }
    }

    // Cells are on the page but not in any row-like arrangement.
    const byProximity = tableProximity(cells, rawQ, targetCell, P, mode, N, q, targetHits);
    if (byProximity) return byProximity;
  }

  // ---- Strategy 2: context sentence, then raw_text inside it -------------
  const ctxQ = q(ctx);
  if (ctxQ) {
    const ctxHits = allIndexesOf(N.norm, ctxQ);
    if (ctxHits.length) {
      const hit = withinCtx(ctxHits[0], ctxHits[0] + ctxQ.length, 'context', true);
      // The sentence itself appearing twice on the page is still a guess.
      if (hit) return { ...hit, ambiguous: hit.ambiguous || ctxHits.length > 1 };
    }

    // ---- Strategy 3: partial context (paraphrased head or tail) ---------
    for (const frac of [0.7, 0.5, 0.35]) {
      const n = Math.floor(ctxQ.length * frac);
      if (n < 25) break;
      for (const part of [ctxQ.slice(0, n), ctxQ.slice(-n)]) {
        const hits = allIndexesOf(N.norm, part);
        if (hits.length) {
          const hit = withinCtx(
            Math.max(0, hits[0] - ctxQ.length),
            hits[0] + ctxQ.length * 1.5,
            `context-partial-${frac}`,
          );
          if (hit) return hit;
        }
      }
    }
  }

  // ---- Strategy 4: raw_text alone, disambiguated by context tokens -------
  const hits = targetHits(0, Infinity);
  if (hits.length === 1) {
    return { start: hits[0], end: hits[0] + rawQ.length, strategy: 'raw-unique', ambiguous: false };
  }
  if (hits.length > 1) {
    // Score each candidate by how many context/metric tokens sit nearby.
    const tokens = [...(ctx.match(/[A-Za-z₹][\w.,%₹-]{3,}/g) || []),
                    ...(fact.metric?.match(/[A-Za-z][\w-]{3,}/g) || [])]
      .map((c) => q(c)).filter((t) => t.length > 3).slice(0, 24);
    let best = null;
    for (const h of hits) {
      const win = N.norm.slice(Math.max(0, h - 220), h + 220);
      const score = tokens.reduce((n, t) => n + (win.includes(t) ? 1 : 0), 0);
      if (!best || score > best.score) best = { h, score };
    }
    if (best && best.score > 0) {
      return {
        start: best.h, end: best.h + rawQ.length,
        strategy: 'raw-scored', ambiguous: true,
      };
    }
    return { start: hits[0], end: hits[0] + rawQ.length, strategy: 'raw-first', ambiguous: true };
  }

  return null;
}

/**
 * Convert a normalised range into per-line rectangles in PDF user space.
 * Characters inside one text item are positioned by proportional width, which
 * is accurate enough for an underline or a circle-up.
 */
export function rangeToRects(hit, P, mode = 'strict') {
  const { idx } = P[mode];
  const rawStart = idx[hit.start];
  const rawEnd = idx[hit.end - 1] + 1;
  if (rawStart == null || rawEnd == null) return [];

  // Collect, per text item, the character span the match covers.
  const spans = new Map();
  for (let i = rawStart; i < rawEnd; i++) {
    const m = P.map[i];
    if (!m || m.o < 0) continue;
    const cur = spans.get(m.i);
    if (cur) { cur.a = Math.min(cur.a, m.o); cur.b = Math.max(cur.b, m.o + 1); }
    else spans.set(m.i, { a: m.o, b: m.o + 1 });
  }

  const boxes = [];
  for (const [i, sp] of spans) {
    const it = P.items[i];
    if (!it || !it.str || !it.width) continue;
    const len = it.str.length;
    const x0 = it.transform[4] + (it.width * sp.a) / len;
    const x1 = it.transform[4] + (it.width * sp.b) / len;
    const baseline = it.transform[5];
    const h = it.height || 10;
    boxes.push({ x0, x1, baseline, h });
  }
  if (!boxes.length) return [];

  // Group boxes into visual lines by baseline, then merge each line.
  // A wide horizontal gap means the run jumped table columns, not words —
  // merging across it would draw one enormous mark over the whole row.
  boxes.sort((a, b) => b.baseline - a.baseline || a.x0 - b.x0);
  const lines = [];
  for (const b of boxes) {
    const line = lines.find(
      (l) => Math.abs(l.baseline - b.baseline) <= Math.max(2, b.h * 0.4)
          && b.x0 - l.x1 <= Math.max(12, b.h * 2.5)
          && b.x0 >= l.x0 - Math.max(12, b.h * 2.5),
    );
    if (line) {
      line.x0 = Math.min(line.x0, b.x0);
      line.x1 = Math.max(line.x1, b.x1);
      line.h = Math.max(line.h, b.h);
    } else {
      lines.push({ ...b });
    }
  }

  // PDF space: y grows upward from the bottom-left. Emit top-left origin rects
  // relative to the page height so the viewer can scale them directly.
  return lines.map((l) => ({
    x: l.x0,
    w: Math.max(l.x1 - l.x0, 1),
    baseline: l.baseline,
    h: l.h,
  }));
}
