/**
 * Builds an OCR text layer for pages whose content is a raster image.
 *
 * Several figures in the DRHP — the network map, the bed-mix chart, the peer
 * comparison table — are pasted bitmaps. Their text is visible but absent from
 * the PDF's text layer, so no string search can anchor a mark to them. This
 * renders those pages, OCRs them, and emits word boxes shaped exactly like
 * pdf.js text items so the existing matcher works on them unchanged.
 *
 *   node scripts/ocr-pages.mjs 228 229 232 233
 *   node scripts/ocr-pages.mjs --auto     # every page with an embedded image
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

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
const CACHE = path.join(HERE, 'cache');
const FACTS = findFile(['manipal_drhp_our_business_facts.json'], SEARCH_DIRS);

const DPI = 400;
const PT_PER_PX = 72 / DPI;
const PAGE_H = 841.92;
// Tesseract emits -1 for whole-line pseudo-rows and low numbers for noise.
const MIN_CONF = 40;

const args = process.argv.slice(2);

/** Pages that actually contain a bitmap, per poppler. */
function pagesWithImages() {
  const pageNums = [...new Set(
    JSON.parse(readFileSync(FACTS, 'utf8')).facts.map((f) => f.page_number),
  )].sort((a, b) => a - b);
  return pageNums.filter((p) => {
    const out = execFileSync('pdfimages', ['-list', '-f', String(p), '-l', String(p), PDF], { encoding: 'utf8' });
    return out.split('\n').some((l) => /\bimage\b/.test(l) && !/^page/.test(l.trim()));
  });
}

const pages = args.includes('--auto') || args.length === 0
  ? pagesWithImages()
  : args.map(Number).filter(Boolean);

mkdirSync(CACHE, { recursive: true });
const tmp = path.join(os.tmpdir(), `drhp-ocr-${process.pid}`);
mkdirSync(tmp, { recursive: true });

console.log(`OCR over ${pages.length} page(s): ${pages.join(', ')}`);

for (const pn of pages) {
  const stem = path.join(tmp, `p${pn}`);
  execFileSync('pdftoppm', ['-r', String(DPI), '-f', String(pn), '-l', String(pn), '-png', PDF, stem]);
  const png = `${stem}-${pn}.png`;
  if (!existsSync(png)) { console.warn(`  p${pn}: render failed`); continue; }

  // psm 11 = sparse text: the right mode for scattered labels on a figure.
  const tsv = execFileSync('tesseract', [png, 'stdout', '--psm', '11', 'tsv'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
  });

  const rows = tsv.split('\n').slice(1).map((l) => l.split('\t')).filter((c) => c.length >= 12);
  const items = [];
  let lastLine = null;

  for (const c of rows) {
    const [, , block, par, line, , left, top, w, h, conf] = c.map(Number);
    const text = c[11];
    if (!text || !text.trim() || conf < MIN_CONF) continue;

    const key = `${block}/${par}/${line}`;
    if (lastLine !== null && key !== lastLine && items.length) {
      items[items.length - 1].hasEOL = true;
    }
    lastLine = key;

    const hPt = h * PT_PER_PX;
    const topPt = top * PT_PER_PX;
    items.push({
      str: text,
      // Sit the synthetic baseline near the bottom of the OCR box so the
      // downstream geometry matches how real text items behave.
      transform: [1, 0, 0, 1, left * PT_PER_PX, PAGE_H - (topPt + hPt * 0.88)],
      width: w * PT_PER_PX,
      height: hPt,
      hasEOL: false,
      conf,
    });
    // OCR gives words, not runs; the matcher needs the spaces between them.
    items.push({ str: ' ', transform: [1, 0, 0, 1, 0, 0], width: 0, height: 0, hasEOL: false });
  }
  if (items.length) items[items.length - 1].hasEOL = true;

  writeFileSync(path.join(CACHE, `ocr-${pn}.json`), JSON.stringify({ page: pn, dpi: DPI, items }));
  const words = items.filter((i) => i.str.trim()).length;
  console.log(`  p${pn}: ${words} words`);
}

rmSync(tmp, { recursive: true, force: true });
console.log(`\ncache -> ${path.relative(ROOT, CACHE)}`);
