/**
 * Resolves every verified claim to page geometry in the DRHP and writes
 * public/anchors.json + public/verification.json for the viewer.
 *
 *   node scripts/build-anchors.mjs [--report]
 *
 * Input is the verification report produced by the AI layer: the same
 * raw_text / context_sentence / page_number the old extraction carried, plus a
 * verification `status` per claim and the CRISIL evidence behind it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { preparePage, locate, rangeToRects, normalizeQuery } from './lib/textmatch.mjs';
import { parseEvidence, evidenceStrings } from './lib/evidence.mjs';
import { statusOf } from '../lib/status.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const FRONTEND = path.resolve(HERE, '..');
const SEARCH_DIRS = [FRONTEND, ROOT, path.join(FRONTEND, 'public')];

/**
 * The source PDFs and the report JSON have moved around between the repo root
 * and frontend/. Look in both rather than hard-coding one layout.
 */
function findFile(names, dirs, { optional = false } = {}) {
  for (const d of dirs) {
    for (const n of names) {
      const p = path.join(d, n);
      if (existsSync(p)) return p;
    }
  }
  if (optional) return null;
  throw new Error(`Could not find ${names[0]}. Looked in:\n  ${dirs.join('\n  ')}`);
}

const PDF = findFile(['Registration_24032026122414_MHEL_DRHP.pdf', 'drhp.pdf'], SEARCH_DIRS);
const REPORT = findFile(['manipal_verification_report.json'], SEARCH_DIRS);
// Optional: only needed once the source-viewer tasks (E6–E8) land.
const CRISIL = findFile(['Industry_report_Manipal.pdf', 'crisil.pdf'], SEARCH_DIRS, { optional: true });
const OUT_DIR = path.join(FRONTEND, 'public');

const report = process.argv.includes('--report');

const data = JSON.parse(readFileSync(REPORT, 'utf8'));
// claim_id is stable and traceable back to the report; the old positional
// `f<i>` ids were not, and broke the moment the extraction was regenerated.
const items = data.items.map((x) => ({ ...x, id: x.claim_id }));

const doc = await getDocument({ url: new URL(`file://${PDF}`), useSystemFonts: true }).promise;

const pageNums = [...new Set(items.map((f) => f.page_number))].sort((a, b) => a - b);
// Neighbouring pages are needed for claims whose text straddles a page break.
const needed = [...new Set(pageNums.flatMap((p) => [p - 1, p, p + 1]))]
  .filter((p) => p >= 1 && p <= doc.numPages).sort((a, b) => a - b);

const pages = new Map();
for (const pn of needed) {
  const page = await doc.getPage(pn);
  const tc = await page.getTextContent();
  const vp = page.getViewport({ scale: 1 });
  const entry = { P: preparePage(tc.items), width: vp.width, height: vp.height };

  // Figures pasted in as bitmaps have no text layer. `npm run ocr` renders and
  // OCRs those pages into pdf.js-shaped word boxes; if a cache exists, it acts
  // as a second layer the same matcher can run against.
  const cached = path.join(HERE, 'cache', `ocr-${pn}.json`);
  if (existsSync(cached)) {
    entry.OCR = preparePage(JSON.parse(readFileSync(cached, 'utf8')).items);
  }
  pages.set(pn, entry);
}

// Strategies strong enough to trust when the match lands on a page the report
// did not claim. A bare number matches anywhere, so a distant page has to be
// earned by surrounding context, never by the value alone.
const CONTEXT_BEARING = /^(table-|context)/;

/**
 * Visual line numbers for the card's "Page 228 · Line 14" reference.
 *
 * The report carries no line numbers, so they are derived from the layer that
 * actually produced the match: cluster every text item's baseline, sort down
 * the page, and take the anchor's rank. Computed against the matching layer
 * (real text or OCR) so a figure caption numbers against the figure's own
 * lines rather than an unrelated text column.
 */
function linesOf(L) {
  if (!L._lines) {
    const ys = L.items
      .filter((i) => i.str && i.str.trim() && i.width)
      .map((i) => i.transform[5])
      .sort((a, b) => b - a);
    const lines = [];
    for (const y of ys) {
      if (!lines.length || Math.abs(lines[lines.length - 1] - y) > 2.5) lines.push(y);
    }
    L._lines = lines;
  }
  return L._lines;
}

function lineAt(L, baseline) {
  const lines = linesOf(L);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < lines.length; i++) {
    const d = Math.abs(lines[i] - baseline);
    if (d < bestD) { bestD = d; best = i; }
  }
  return lines.length ? best + 1 : null;
}

const anchors = {};
const stats = {
  total: items.length, placed: 0, missed: 0, ambiguous: 0,
  offPage: 0, relocated: 0, byStrategy: {}, byStatus: {},
};
const misses = [];

for (const f of items) {
  let resolved = null;
  const tryPage = (pn, accept) => {
    const entry = pages.get(pn);
    if (!entry) return null;
    // Real text layer first; the OCR layer is only consulted when it fails.
    for (const [layer, L] of [['', entry.P], ['ocr', entry.OCR]]) {
      if (!L) continue;
      for (const mode of ['strict', 'loose']) {
        const hit = locate(f, L, mode);
        if (!hit) continue;
        // Loose matching drops punctuation, so only trust it when the
        // surrounding context carried the match, not a bare number. OCR text
        // carries recognition errors, so hold it to the same bar throughout.
        if ((mode === 'loose' || layer === 'ocr') && !CONTEXT_BEARING.test(hit.strategy)) continue;
        if (accept && !accept(hit)) continue;
        // A claim may resolve to several spans when its sentence repeats the
        // value (actual vs pro forma); each one gets its own mark.
        const spans = hit.spans?.length ? hit.spans : [[hit.start, hit.end]];
        const rects = spans.flatMap(([start, end]) => rangeToRects({ start, end }, L, mode));
        if (!rects.length) continue;
        const strategy = hit.strategy
          + (mode === 'loose' ? '~loose' : '')
          + (layer === 'ocr' ? '~ocr' : '');
        return { page: pn, rects, hit: { ...hit, strategy }, entry, L, ocr: layer === 'ocr' };
      }
    }
    return null;
  };

  // Own page first, then the neighbours (a span can straddle a page break).
  for (const pn of [f.page_number, f.page_number - 1, f.page_number + 1]) {
    resolved = tryPage(pn);
    if (resolved) break;
  }

  // Still nothing: the report's page attribution may simply be wrong.
  // Sweep the whole section, but only accept a context-bearing match.
  if (!resolved) {
    for (const pn of pageNums) {
      if (Math.abs(pn - f.page_number) <= 1) continue;
      const r = tryPage(pn, (h) => CONTEXT_BEARING.test(h.strategy) && !h.ambiguous);
      if (r) { resolved = r; break; }
    }
    if (resolved) stats.relocated++;
  }

  if (!resolved) {
    stats.missed++;
    misses.push(f);
    continue;
  }

  const { page, rects, hit, entry, L } = resolved;
  stats.placed++;
  if (resolved.ocr) stats.viaOcr = (stats.viaOcr || 0) + 1;
  if (hit.ambiguous) stats.ambiguous++;
  if (page !== f.page_number) stats.offPage++;
  stats.byStrategy[hit.strategy] = (stats.byStrategy[hit.strategy] || 0) + 1;

  anchors[f.id] = {
    page,
    // Colour comes from the verification verdict now; there is no shape rule.
    status: statusOf(f.status).key,
    strategy: hit.strategy,
    ambiguous: !!hit.ambiguous,
    ocr: !!resolved.ocr,
    // Derived, not reported: rank of this mark's baseline among the page's
    // text lines. Gives the card a real "Page 228 · Line 14" reference.
    line: lineAt(L, rects[0].baseline),
    pageWidth: entry.width,
    pageHeight: entry.height,
    // Top-left origin, PDF points. The viewer multiplies by its render scale.
    rects: rects.map((r) => ({
      x: +r.x.toFixed(2),
      y: +(entry.height - r.baseline - r.h * 0.78).toFixed(2),
      w: +r.w.toFixed(2),
      h: +(r.h * 1.05).toFixed(2),
      baselineY: +(entry.height - r.baseline).toFixed(2),
    })),
  };
}

for (const f of items) stats.byStatus[f.status] = (stats.byStatus[f.status] || 0) + 1;

// The report often records the same span several times under differently worded
// metrics ("Licensed beds in Bengaluru (Karnataka)" / "Beds in Bengaluru").
// Drawing one mark per claim stacks them into a scribble, so marks are grouped
// by the geometry they resolved to and drawn once.
//
// Status joins the key: two claims on the same span with different verdicts are
// genuinely different marks and must not be merged into one colour.
const groups = new Map();
for (const [id, a] of Object.entries(anchors)) {
  const geom = a.rects.map((r) => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)}`).join(';');
  const key = `${a.page}:${a.status}:${geom}`;
  if (!groups.has(key)) {
    groups.set(key, {
      key, page: a.page, status: a.status, rects: a.rects,
      ambiguous: a.ambiguous, claimIds: [],
    });
  }
  const g = groups.get(key);
  g.claimIds.push(id);
  // One uncertain member makes the whole mark uncertain.
  g.ambiguous = g.ambiguous || a.ambiguous;
}
for (const g of groups.values()) {
  for (const id of g.claimIds) {
    anchors[id].groupKey = g.key;
    anchors[id].groupSize = g.claimIds.length;
  }
}
stats.marks = groups.size;
stats.stacked = stats.placed - groups.size;

// ── CRISIL source pages: geometry for the evidence peek (tasks E6–E8) ─────
// Matching happens here, offline, like everything else — the viewer renders
// rects it is handed rather than running a matcher in the browser.
const crisilPages = new Map();
if (CRISIL) {
  const cdoc = await getDocument({ url: new URL(`file://${CRISIL}`), useSystemFonts: true }).promise;
  const wanted = [...new Set(
    items.flatMap((f) => (f.evidence || []).map((e) => e.page_number + 1)),
  )].filter((p) => p >= 1 && p <= cdoc.numPages).sort((a, b) => a - b);
  for (const pn of wanted) {
    const page = await cdoc.getPage(pn);
    const vp = page.getViewport({ scale: 1 });
    crisilPages.set(pn, { L: preparePage((await page.getTextContent()).items), width: vp.width, height: vp.height });
  }
  console.log(`crisil pages prepared: ${crisilPages.size}`);
}

/**
 * Highlight geometry for one evidence passage on its CRISIL page.
 *
 * The passage is matched in segments rather than whole: a paragraph the model
 * lifted from the report rarely survives verbatim (it re-wraps, drops a
 * footnote marker, folds a table row). Segment matching degrades gracefully —
 * the parts that are found get marked, the parts that are not are simply
 * skipped. Nothing is guessed: a passage that matches nothing renders as a
 * plain page, which is the honest outcome. A wrong highlight on a source
 * document would be worse than none.
 */
function evidenceRects(plain, entry) {
  if (!entry) return [];
  const { L, height } = entry;
  const N = L.loose;
  const segments = plain
    .split(/(?<=[.;:])\s+|\s{2,}|(?<=\|)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 14);
  const out = [];
  for (const seg of segments) {
    const q = normalizeQuery(seg, 'loose');
    if (q.length < 14) continue;
    const i = N.norm.indexOf(q);
    if (i < 0) continue;
    // A segment repeated on the page is not a safe anchor.
    if (N.norm.indexOf(q, i + 1) !== -1) continue;
    for (const r of rangeToRects({ start: i, end: i + q.length }, L, 'loose')) {
      out.push({
        x: +r.x.toFixed(2),
        y: +(height - r.baseline - r.h * 0.78).toFixed(2),
        w: +r.w.toFixed(2),
        h: +(r.h * 1.05).toFixed(2),
      });
    }
  }
  return out;
}

// ── evidence: parse once here so the viewer never handles markup ───────────
let evidenceCount = 0;
let evidenceWithRects = 0;
const claims = items.map((f) => {
  const evidence = (f.evidence || []).map((e) => {
    evidenceCount++;
    const { blocks, plain } = parseEvidence(e.text);
    // Report pages are 0-indexed against Industry_report_Manipal.pdf; verified
    // +1 on 122/122 testable passages. Keep both: `page` is what the report
    // says, `pdfPage` is where to actually render it.
    const pdfPage = e.page_number + 1;
    const src = crisilPages.get(pdfPage);
    const rects = evidenceRects(plain, src);
    if (rects.length) evidenceWithRects++;
    return {
      evidenceId: e.evidence_id,
      sourceDocId: e.source_doc_id,
      page: e.page_number,
      pdfPage,
      pageWidth: src?.width ?? null,
      pageHeight: src?.height ?? null,
      rects,
      blocks,
      plain,
    };
  });
  return {
    id: f.id,
    page: f.page_number,
    itemType: f.item_type,
    metric: f.metric,
    rawText: f.raw_text,
    contextSentence: f.context_sentence,
    claimValue: f.claim_value,
    evidenceValue: f.evidence_value,
    unit: f.unit,
    period: f.period,
    entity: f.entity,
    basis: f.basis,
    claimCategory: f.claim_category,
    status: statusOf(f.status).key,
    rootCause: f.root_cause,
    explanation: f.explanation,
    sourceDocId: f.source_doc_id,
    needsHumanReview: !!f.needs_human_review,
    evidence,
  };
});

// A6 invariant: markup must not reach the viewer.
const leaked = claims.flatMap((c) =>
  c.evidence.flatMap((e) => evidenceStrings(e).filter((s) => s.includes('<'))),
);
if (leaked.length) {
  throw new Error(`evidence sanitisation leaked ${leaked.length} string(s) containing '<'`);
}

mkdirSync(OUT_DIR, { recursive: true });
const serve = (src, name) => {
  if (!src) return false;
  const dest = path.join(OUT_DIR, name);
  if (!existsSync(dest) || statSync(dest).size !== statSync(src).size) {
    copyFileSync(src, dest);
    console.log(`copied ${path.basename(src)} -> public/${name}`);
  }
  return true;
};
serve(PDF, 'drhp.pdf');
const crisilServed = serve(CRISIL, 'crisil.pdf');

writeFileSync(path.join(OUT_DIR, 'anchors.json'), JSON.stringify({
  doc_id: data.doc_id,
  run_id: data.run_id,
  built_at: new Date().toISOString(),
  stats,
  anchors,
  groups: [...groups.values()],
}));
writeFileSync(path.join(OUT_DIR, 'verification.json'), JSON.stringify({
  docId: data.doc_id,
  runId: data.run_id,
  generatedAt: data.generated_at,
  sourceDocIds: data.source_doc_ids,
  sourcePdf: crisilServed ? '/crisil.pdf' : null,
  totalClaims: data.total_claims,
  statusCounts: data.status_counts,
  pages: pageNums,
  claims,
}));

const pct = (n) => `${((n / stats.total) * 100).toFixed(1)}%`;
console.log(`\nclaims           ${stats.total}`);
console.log(`placed           ${stats.placed}  (${pct(stats.placed)})`);
console.log(`  ambiguous      ${stats.ambiguous}`);
console.log(`  on a neighbour ${stats.offPage - stats.relocated}`);
console.log(`  relocated      ${stats.relocated}  (report's page_number was wrong)`);
console.log(`unplaced         ${stats.missed}  (${pct(stats.missed)})`);
console.log(`  via OCR        ${stats.viaOcr || 0}  (text that lives inside a figure)`);
console.log(`marks drawn      ${stats.marks}  (${stats.stacked} duplicate claims share a span)`);
console.log(`evidence         ${evidenceCount} passage(s) parsed, 0 leaked markup`);
console.log(`  highlightable  ${evidenceWithRects}/${evidenceCount} located on their CRISIL page`);

console.log('\nby status:');
for (const [k, v] of Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1])) {
  const placed = Object.values(anchors).filter((a) => a.status === k).length;
  console.log(`  ${k.padEnd(18)} ${String(v).padStart(4)}   placed ${placed}`);
}
console.log('\nby strategy:');
for (const [k, v] of Object.entries(stats.byStrategy).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(22)} ${v}`);
}

// Why did the rest fail? Text that exists nowhere in the section's text layer
// came from an infographic the extractor OCR'd from a raster image — no string
// match can ever anchor it. Everything else is a matcher gap worth chasing.
const sectionText = [...pages.values()].map((e) => e.P.loose.norm).join(' ');
// A bare number like "753" occurs all over the section, so test the claim's
// most distinctive *wording* instead — its row label or context phrase.
const probeOf = (m) => {
  const words = (m.context_sentence || '').split('|')
    .flatMap((c) => c.match(/[A-Za-z][A-Za-z&/. ]{7,}/g) || [])
    .map((s) => s.trim()).sort((a, b) => b.length - a.length);
  return normalizeQuery(words[0] || m.raw_text, 'loose');
};
let absent = 0;
for (const m of misses) {
  const q = probeOf(m);
  if (q && q.length > 5 && !sectionText.includes(q)) { m._absent = true; absent++; }
}
console.log(`\nof the ${misses.length} unplaced:`);
console.log(`  ${absent} have no text layer at all (infographic images — not matchable)`);
console.log(`  ${misses.length - absent} are present in the text but unresolved`);

if (report && misses.length) {
  console.log('\nunplaced claims:');
  for (const m of misses.slice(0, 40)) {
    console.log(`  p${m.page_number} ${String(m.status).padEnd(14)} ${JSON.stringify(m.raw_text).slice(0, 60)}`);
    console.log(`      ctx: ${JSON.stringify(m.context_sentence).slice(0, 100)}`);
  }
}
