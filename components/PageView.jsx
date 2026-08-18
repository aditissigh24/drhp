'use client';

import { useEffect, useRef, useState } from 'react';
import MarkLayer from './MarkLayer';

const PAGE_W = 595.32;
const PAGE_H = 841.92;

/** One rendered PDF page with its mark overlay. Renders only once in view. */
export default function PageView({ pdf, pageNum, scale, groups, selectedId, onSelect, registerRef }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [near, setNear] = useState(false);
  const [dims, setDims] = useState({ w: PAGE_W * scale, h: PAGE_H * scale });

  useEffect(() => {
    registerRef(pageNum, wrapRef.current);
    return () => registerRef(pageNum, null);
  }, [pageNum, registerRef]);

  // Only pay for rendering pages the reader is close to.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setNear(true),
      { root: el.closest('.docpane'), rootMargin: '900px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !pdf) return undefined;
    let task = null;
    let cancelled = false;

    (async () => {
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      setDims({ w: viewport.width, h: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      task = page.render({ canvasContext: ctx, viewport });
      try { await task.promise; } catch { /* superseded by a newer render */ }
    })();

    return () => { cancelled = true; task?.cancel?.(); };
  }, [near, pdf, pageNum, scale]);

  return (
    <div
      ref={wrapRef}
      className="pagewrap"
      style={{ width: dims.w, height: dims.h }}
      data-page={pageNum}
    >
      <div className="pagelabel">Page {pageNum}</div>
      {near ? (
        <canvas ref={canvasRef} />
      ) : (
        <div className="pageskeleton" style={{ width: '100%', height: '100%' }}>{pageNum}</div>
      )}
      {near && groups.length > 0 && (
        <MarkLayer
          page={pageNum}
          groups={groups}
          width={PAGE_W}
          height={PAGE_H}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
