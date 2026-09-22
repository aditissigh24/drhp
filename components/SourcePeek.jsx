'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The DRHP page behind a piece of evidence, with the passage highlighted
 * (tasks E6–E8). The evidence is quoted from the document under review, so
 * this opens the same PDF the reader is already scrolling, at another page.
 *
 * A peek rather than a permanent third pane: only 1,493 of 9,053 claims carry
 * evidence that could be located on its page, so a pane devoted to it would
 * sit empty most of the time.
 *
 * The PDF is fetched on first open and cached for the session — it never costs
 * the initial page load.
 */
let docPromise = null;
function loadSourceDoc(url) {
  if (!docPromise) {
    docPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      return pdfjs.getDocument({ url }).promise;
    })();
  }
  return docPromise;
}

export default function SourcePeek({ evidence, sourcePdf, onClose }) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const [dims, setDims] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let task = null;
    setError(null);
    setDims(null);

    (async () => {
      try {
        const doc = await loadSourceDoc(sourcePdf);
        if (cancelled) return;
        const page = await doc.getPage(evidence.pdfPage);
        if (cancelled) return;

        const avail = (boxRef.current?.clientWidth || 600) - 24;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.max(0.4, Math.min(2, avail / base.width));
        const viewport = page.getViewport({ scale });
        setDims({ w: viewport.width, h: viewport.height, pw: base.width, ph: base.height });

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
        await task.promise;
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      }
    })();

    return () => { cancelled = true; task?.cancel?.(); };
  }, [evidence, sourcePdf]);

  const rects = evidence.rects || [];

  return (
    <div className="peek" role="dialog" aria-label="Source document">
      <div className="peek-head">
        <div className="peek-title">
          DRHP
          <span className="peek-sub">page {evidence.page}</span>
        </div>
        <button className="linkbtn" onClick={onClose}>Close</button>
      </div>

      {/* Honest about the limit: an un-located passage shows the page plainly
          rather than a guessed highlight. A wrong highlight on a source
          document is worse than none. */}
      {rects.length === 0 && (
        <div className="peek-note">
          Showing the cited page. The exact passage could not be matched on it,
          so nothing is highlighted — read the quoted text on the card.
        </div>
      )}

      <div className="peek-body" ref={boxRef}>
        {error && <div className="peek-note err">Could not load the source: {error}</div>}
        <div className="peek-page" style={dims ? { width: dims.w, height: dims.h } : undefined}>
          <canvas ref={canvasRef} />
          {dims && rects.length > 0 && (
            <svg
              className="peek-marks"
              viewBox={`0 0 ${dims.pw} ${dims.ph}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {rects.map((r, i) => (
                <rect key={i} x={r.x - 1} y={r.y - 1} width={r.w + 2} height={r.h + 2} rx="2" />
              ))}
            </svg>
          )}
          {!dims && !error && <div className="peek-loading">Loading source page…</div>}
        </div>
      </div>
    </div>
  );
}
