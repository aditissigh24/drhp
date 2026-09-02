/**
 * Evidence passages arrive as a hybrid of markup and pipe-tables:
 *
 *   "Player | Key specialties | Description\n<b>Manipal</b> | <p>A multi-…</p>
 *    <p>Cardiology…</p> | <p>The first facility…</p>"
 *
 * Rendering that raw would either show tags to the user or, worse, require
 * dangerouslySetInnerHTML on text produced by an upstream model. So it is
 * parsed once at build time into plain structured blocks the viewer can render
 * with ordinary JSX.
 *
 * Invariant: no '<' survives into the emitted output.
 */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

/**
 * Strip tags, then decode entities, then remove any angle bracket the decoding
 * reintroduced. Order matters: decoding first would let "&lt;b&gt;" become a
 * tag that the stripper then eats, silently deleting the author's literal text.
 */
function clean(s) {
  let out = String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? ' ')
    .replace(/[<>]/g, '');
  return out.replace(/\s+/g, ' ').trim();
}

/** Split a chunk into paragraphs on </p> boundaries before tags are stripped. */
const paragraphsOf = (s) =>
  String(s ?? '')
    .split(/<\/p\s*>|<br\s*\/?>/i)
    .map(clean)
    .filter(Boolean);

const isDivider = (c) => /^[\s|:-]*$/.test(c);

/**
 * Parse one evidence passage into renderable blocks.
 *
 * Returns { blocks, plain } where blocks is a list of
 *   { kind: 'table', head: string[]|null, rows: string[][] }
 *   { kind: 'text',  paragraphs: string[] }
 * and `plain` is the whole passage as flat text, used for matching the passage
 * back onto the source PDF page (task E8).
 */
export function parseEvidence(text) {
  const lines = String(text ?? '').split('\n');

  // Group consecutive lines of the same kind, so a table keeps its header row
  // attached to its data rows.
  const groups = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const kind = line.includes('|') ? 'table' : 'text';
    const last = groups[groups.length - 1];
    if (last && last.kind === kind) last.lines.push(line);
    else groups.push({ kind, lines: [line] });
  }

  const blocks = [];
  for (const g of groups) {
    if (g.kind === 'table') {
      const rows = g.lines
        .map((l) => l.split('|').map((c) => paragraphsOf(c).join('\n')))
        // A markdown separator row ("|---|---|") is layout, not data.
        .filter((cells) => !cells.every(isDivider))
        .map((cells) => (cells.length > 1 && !cells[0] ? cells.slice(1) : cells))
        .map((cells) => (cells.length > 1 && !cells[cells.length - 1] ? cells.slice(0, -1) : cells));
      if (!rows.length) continue;
      // A lone row has nothing to be a header for; treat it as data.
      const head = rows.length > 1 ? rows[0] : null;
      blocks.push({ kind: 'table', head, rows: head ? rows.slice(1) : rows });
    } else {
      const paragraphs = g.lines.flatMap(paragraphsOf);
      if (paragraphs.length) blocks.push({ kind: 'text', paragraphs });
    }
  }

  const plain = blocks
    .flatMap((b) =>
      b.kind === 'table'
        ? [...(b.head ? [b.head] : []), ...b.rows].map((r) => r.join(' '))
        : b.paragraphs,
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { blocks, plain };
}

/** Every string a parsed passage will render, for invariant checks. */
export function evidenceStrings({ blocks, plain }) {
  const out = [plain];
  for (const b of blocks) {
    if (b.kind === 'table') {
      if (b.head) out.push(...b.head);
      for (const r of b.rows) out.push(...r);
    } else {
      out.push(...b.paragraphs);
    }
  }
  return out;
}
