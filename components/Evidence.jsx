'use client';

/**
 * Renders one CRISIL evidence passage.
 *
 * Everything here is plain structured data parsed at build time — no markup
 * from the model reaches the DOM. Isolated in its own file (task E5) so the
 * source-PDF peek can grow beside it without disturbing card layout.
 */
export default function Passage({ e, onOpenSource }) {
  const locatable = e.rects?.length > 0;
  return (
    <div className="passage">
      <div className="passage-head">
        <span className="passage-src">CRISIL Report · p.{e.page}</span>
        {onOpenSource && (
          <button
            className="linkbtn tiny"
            onClick={(ev) => { ev.stopPropagation(); onOpenSource(e); }}
            title={locatable
              ? 'Open this page of the CRISIL report with the passage highlighted'
              : 'Open this page of the CRISIL report'}
          >
            View source page{locatable ? '' : ' (not highlighted)'}
          </button>
        )}
      </div>
      {e.blocks.map((b, i) => (b.kind === 'table' ? (
        <div className="passage-table" key={i}>
          <table>
            {b.head && <thead><tr>{b.head.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>}
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div key={i}>{b.paragraphs.map((p, pi) => <p key={pi}>{p}</p>)}</div>
      )))}
    </div>
  );
}
