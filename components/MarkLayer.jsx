'use client';

import { statusOf } from '@/lib/status.mjs';

/**
 * Draws every mark for one page. The SVG viewBox is the page in PDF points, so
 * anchor rects need no conversion and the marks stay glued to the glyphs at any
 * zoom level.
 *
 * Colour carries the verification verdict — there is no shape rule any more.
 * One mark per *span*, not per claim: several extractions frequently describe
 * the same number, and drawing each one stacks tints into mud.
 *
 * Selection is carried by everything *else* receding rather than by decorating
 * the chosen mark: on a page with 100+ marks the contrast does the work, and an
 * extra ring on top is one cue too many.
 */
export default function MarkLayer({ page, groups, width, height, selectedId, onSelect }) {
  const isSelected = (g) => g.claimIds.includes(selectedId);
  const anySelected = !!selectedId;
  // The selected mark renders last so it sits above its neighbours.
  const ordered = [...groups].sort((a, b) => isSelected(a) - isSelected(b));

  return (
    <svg
      className="marklayer"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label={`Marks on page ${page}`}
    >
      {ordered.map((g) => {
        const selected = isSelected(g);
        const cls = [
          'mark',
          `tone-${statusOf(g.status).tone}`,
          g.ambiguous ? 'ambiguous' : '',
          // Filtered out, not removed: the mark stays clickable so the reader
          // can still ask about a figure they can see on the page.
          g.dimmed && !selected ? 'dimmed' : '',
          // Focus mode: once something is selected everything else recedes, so
          // the one mark under discussion is unmistakable on a crowded page.
          anySelected && !selected ? 'unfocused' : '',
          selected ? 'selected' : '',
        ].filter(Boolean).join(' ');
        return (
          <g
            key={g.key}
            className={cls}
            // Stop the click reaching the page, which clears focus.
            onClick={(e) => { e.stopPropagation(); onSelect(g.claimIds[0]); }}
          >
            {g.rects.map((r, i) => (
              <rect
                key={i}
                className="tint"
                x={r.x - 1.6} y={r.y - 1}
                width={r.w + 3.2} height={r.h + 2}
                rx="2.5"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
