/**
 * Resolves every fact in the extraction to page geometry in the DRHP and
 * writes public/anchors.json for the viewer to render.
 *
 *   node scripts/build-anchors.mjs [--report]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { statSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { preparePage, locate, rangeToRects, markShape } from './lib/textmatch.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const FRONTEND = path.resolve(HERE, '..');
const SEARCH_DIRS = [FRONTEND, ROOT, path.join(FRONTEND, 'public')];

/**
 * The source PDF and the extraction JSON have moved around between the repo
 * root and frontend/. Look in both rather than hard-coding one layout.
 */
function findFile(names, dirs) {
  for (const d of dirs) {
    for (const n of names) {
      const p = path.join(d, n);
      if (existsSync(p)) return p;
    }
  }
  throw new Error(
    `Could not find ${names[0]}. Looked in:\n  ${dirs.join('\n  ')}`,
  );
}

const PDF = findFile(['Registration_24032026122414_MHEL_DRHP.pdf'], SEARCH_DIRS);
const FACTS = findFile(['manipal_drhp_our_business_facts.json'], SEARCH_DIRS);
const OUT_DIR = path.join(FRONTEND, 'public');

const report = process.argv.includes('--report');

const data = JSON.parse(readFileSync(FACTS, 'utf8'));
const facts = data.facts.map((f, i) => ({ ...f, id: `f${i}` }));

const doc = await getDocument({ url: new URL(`file://${PDF}`), useSystemFonts: true }).promise;

const pageNums = [...new Set(facts.map((f) => f.page_number))].sort((a, b) => a - b);
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

// Strategies strong enough to trust when the match lands on a page the
// extraction did not claim. A bare number matches anywhere, so a distant page
// has to be earned by surrounding context, never by the value alone.
const CONTEXT_BEARING = /^(table-|context)/;

const anchors = {};
const stats = {
  total: facts.length, placed: 0, missed: 0, ambiguous: 0,
  offPage: 0, relocated: 0, byStrategy: {},
};
const misses = [];
const relocations = [];

for (const f of facts) {
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
        // A fact may resolve to several spans when its sentence repeats the
        // value (actual vs pro forma); each one gets its own mark.
        const spans = hit.spans?.length ? hit.spans : [[hit.start, hit.end]];
        const rects = spans.flatMap(([start, end]) => rangeToRects({ start, end }, L, mode));
        if (!rects.length) continue;
        const strategy = hit.strategy
          + (mode === 'loose' ? '~loose' : '')
          + (layer === 'ocr' ? '~ocr' : '');
        return { page: pn, rects, hit: { ...hit, strategy }, entry, ocr: layer === 'ocr' };
      }
    }
    return null;
  };

  // Own page first, then the neighbours (a span can straddle a page break).
  for (const pn of [f.page_number, f.page_number - 1, f.page_number + 1]) {
    resolved = tryPage(pn);
    if (resolved) break;
  }

  // Still nothing: the extraction's page attribution may simply be wrong.
  // Sweep the whole section, but only accept a context-bearing match.
  if (!resolved) {
    for (const pn of pageNums) {
      if (Math.abs(pn - f.page_number) <= 1) continue;
      const r = tryPage(pn, (h) => CONTEXT_BEARING.test(h.strategy) && !h.ambiguous);
      if (r) { resolved = r; break; }
    }
    if (resolved) {
      stats.relocated++;
      relocations.push({ f, to: resolved.page });
    }
  }

  if (!resolved) {
    stats.missed++;
    misses.push(f);
    continue;
  }

  const { page, rects, hit, entry } = resolved;
  stats.placed++;
  if (resolved.ocr) stats.viaOcr = (stats.viaOcr || 0) + 1;
  if (hit.ambiguous) stats.ambiguous++;
  if (page !== f.page_number) stats.offPage++;
  stats.byStrategy[hit.strategy] = (stats.byStrategy[hit.strategy] || 0) + 1;

  anchors[f.id] = {
    page,
    shape: markShape(f),
    strategy: hit.strategy,
    ambiguous: !!hit.ambiguous,
    ocr: !!resolved.ocr,
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

// The extraction often records the same span several times under differently
// worded metrics ("Licensed beds in Bengaluru (Karnataka)" / "Beds in
// Bengaluru"). Drawing one mark per fact stacks them into a scribble, so marks
// are grouped by the geometry they resolved to and drawn once.
const groups = new Map();
for (const [id, a] of Object.entries(anchors)) {
  const key = `${a.page}:${a.shape}:${a.rects.map((r) => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)}`).join(';')}`;
  if (!groups.has(key)) {
    groups.set(key, {
      key, page: a.page, shape: a.shape, rects: a.rects,
      ambiguous: a.ambiguous, factIds: [],
    });
  }
  const g = groups.get(key);
  g.factIds.push(id);
  // One uncertain member makes the whole mark uncertain.
  g.ambiguous = g.ambiguous || a.ambiguous;
}
for (const g of groups.values()) {
  for (const id of g.factIds) {
    anchors[id].groupKey = g.key;
    anchors[id].groupSize = g.factIds.length;
  }
}
stats.marks = groups.size;
stats.stacked = stats.placed - groups.size;

mkdirSync(OUT_DIR, { recursive: true });
// The viewer fetches /drhp.pdf, so make sure public/ holds the current source.
const served = path.join(OUT_DIR, 'drhp.pdf');
if (!existsSync(served) || statSync(served).size !== statSync(PDF).size) {
  copyFileSync(PDF, served);
  console.log(`copied ${path.basename(PDF)} -> public/drhp.pdf`);
}
writeFileSync(path.join(OUT_DIR, 'anchors.json'), JSON.stringify({
  doc_id: data.doc_id,
  built_at: new Date().toISOString(),
  stats,
  anchors,
  groups: [...groups.values()],
}));
writeFileSync(path.join(OUT_DIR, 'facts.json'), JSON.stringify({
  doc_id: data.doc_id,
  fact_count: data.fact_count,
  pages: pageNums,
  facts,
}));

const pct = (n) => `${((n / stats.total) * 100).toFixed(1)}%`;
console.log(`\nfacts            ${stats.total}`);
console.log(`placed           ${stats.placed}  (${pct(stats.placed)})`);
console.log(`  ambiguous      ${stats.ambiguous}`);
console.log(`  on a neighbour ${stats.offPage - stats.relocated}`);
console.log(`  relocated      ${stats.relocated}  (extraction's page_number was wrong)`);
console.log(`unplaced         ${stats.missed}  (${pct(stats.missed)})`);
console.log(`  via OCR        ${stats.viaOcr || 0}  (text that lives inside a figure)`);
console.log(`marks drawn      ${stats.marks}  (${stats.stacked} duplicate facts share a span)`);
console.log('\nby strategy:');
for (const [k, v] of Object.entries(stats.byStrategy).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(22)} ${v}`);
}
// Why did the rest fail? Text that exists nowhere in the section's text layer
// came from an infographic the extractor OCR'd from a raster image — no string
// match can ever anchor it. Everything else is a matcher gap worth chasing.
const { normalizeQuery } = await import('./lib/textmatch.mjs');
const sectionText = [...pages.values()].map((e) => e.P.loose.norm).join(' ');
// A bare number like "753" occurs all over the section, so test the fact's
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
  console.log('\nunplaced facts:');
  for (const m of misses.slice(0, 40)) {
    console.log(`  p${m.page_number} ${m.extraction_type.padEnd(6)} ${JSON.stringify(m.raw_text).slice(0, 70)}`);
    console.log(`      ctx: ${JSON.stringify(m.context_sentence).slice(0, 100)}`);
  }
}
