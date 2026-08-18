'use client';

import { useMemo } from 'react';
import { circlePath, underlinePath } from '@/lib/marks';

/**
 * Draws every mark for one page. The SVG viewBox is the page in PDF points,
 * so anchor rects need no conversion and the marks stay glued to the glyphs
 * at any zoom level.
 *
 * One mark per *span*, not per fact — several extractions frequently describe
 * the same number, and drawing each one stacks strokes into a scribble.
 */
export default function MarkLayer({ page, groups, width, height, selectedId, onSelect }) {
  const paths = useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        d:
          g.shape === 'circle'
            ? g.rects.map((r) => circlePath(r, g.key))
            : g.rects.map((r, i) => underlinePath(r, g.key, i)),
      })),
    [groups],
  );

  // The selected mark renders last so its stroke sits above its neighbours.
  const isSelected = (g) => g.factIds.includes(selectedId);
  const ordered = [...paths].sort((a, b) => isSelected(a) - isSelected(b));

  return (
    <svg
      className="marklayer"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label={`Marks on page ${page}`}
    >
      {ordered.map((g) => {
        const cls = [
          'mark',
          g.shape,
          g.ambiguous ? 'ambiguous' : '',
          isSelected(g) ? 'selected' : '',
        ].filter(Boolean).join(' ');
        return (
          <g key={g.key} className={cls} onClick={() => onSelect(g.factIds[0])}>
            {g.rects.map((r, i) => (
              <rect
                key={`g${i}`} className="glow"
                x={r.x - 2} y={r.y - 2} width={r.w + 4} height={r.h + 4} rx="3"
              />
            ))}
            {g.d.map((d, i) => <path key={`h${i}`} className="hit" d={d} />)}
            {g.d.map((d, i) => <path key={`i${i}`} className="ink" d={d} />)}
          </g>
        );
      })}
    </svg>
  );
}
