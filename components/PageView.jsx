'use client';

import { useEffect, useRef, useState } from 'react';
import MarkLayer from './MarkLayer';

// A4 in PDF points — what a page is assumed to be until it reports its own size.
const PAGE_W = 595.32;
const PAGE_H = 841.92;

// How close a page must come before it renders, and how far it must go before
// its canvas is released. The gap between the two is deliberate: on a single
// threshold a page parked on the boundary flips between rendered and released
// on every small scroll.
const MOUNT_MARGIN = 900;
const RELEASE_MARGIN = 2400;

/**
 * One rendered PDF page with its mark overlay. The canvas exists only while the
 * reader is near the page and is handed back once they scroll well past it.
 */
export default function PageView({ pdf, pageNum, scale, groups, selectedId, onSelect, registerRef }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const textRef = useRef(null);
  const [near, setNear] = useState(false);
  // Held in PDF points rather than pixels so a zoom change resizes every page
  // immediately, including the ones currently released.
  const [pageSize, setPageSize] = useState({ w: PAGE_W, h: PAGE_H });
  // Bumped to force a repaint after the browser hands the 2D context back.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    registerRef(pageNum, wrapRef.current);
    return () => registerRef(pageNum, null);
  }, [pageNum, registerRef]);

  // Only pay for rendering pages the reader is close to, and hand the memory
  // back once they are well away. At dpr 2 a page's backing store is ~13 MB, so
  // latching `near` on for good meant every page ever scrolled past stayed
  // resident — ~350 MB across this section at the default zoom, ~830 MB at 2x.
  // That runs past the browser's canvas budget, and the backing stores it then
  // discards come back as blank canvas.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const root = el.closest('.docpane');
    const mount = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setNear(true); },
      { root, rootMargin: `${MOUNT_MARGIN}px 0px` },
    );
    const release = new IntersectionObserver(
      ([e]) => { if (!e.isIntersecting) setNear(false); },
      { root, rootMargin: `${RELEASE_MARGIN}px 0px` },
    );
    mount.observe(el);
    release.observe(el);
    return () => { mount.disconnect(); release.disconnect(); };
  }, []);

  useEffect(() => {
    if (!near || !pdf) return undefined;
    let task = null;
    let cancelled = false;
    const canvas = canvasRef.current;

    // The browser may take a 2D context away under memory pressure. Calling
    // preventDefault on the loss is what allows it back; repainting once it is
    // restored is what actually puts the page on screen again, since nothing
    // else re-runs this effect for a page that never left the viewport.
    const onLost = (e) => e.preventDefault();
    const onRestored = () => setGeneration((g) => g + 1);
    canvas?.addEventListener('contextlost', onLost);
    canvas?.addEventListener('contextrestored', onRestored);

    (async () => {
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const unscaled = page.getViewport({ scale: 1 });
      setPageSize({ w: unscaled.width, h: unscaled.height });

      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Transparent on purpose. An opaque context starts out black, so a render
      // that is cancelled, fails, or loses its backing store leaves a black
      // slab; transparent falls through to the white .pagewrap instead.
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      task = page.render({ canvasContext: ctx, viewport });
      try {
        await task.promise;
      } catch (e) {
        // A supersede is the one expected outcome here. Everything else is a
        // real failure that used to vanish silently, leaving a blank page and
        // nothing in the console to say why.
        if (e?.name !== 'RenderingCancelledException') {
          console.error(`[PageView] page ${pageNum} failed to render`, e);
        }
        return;
      }
      if (cancelled) return;

      // Selectable text: pdf.js positions transparent spans over the glyphs.
      const container = textRef.current;
      if (container) {
        container.replaceChildren();
        const { TextLayer } = await import('pdfjs-dist');
        const textLayer = new TextLayer({
          textContentSource: await page.getTextContent(),
          container,
          viewport,
        });
        await textLayer.render();
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel?.();
      canvas?.removeEventListener('contextlost', onLost);
      canvas?.removeEventListener('contextrestored', onRestored);
    };
  }, [near, pdf, pageNum, scale, generation]);

  return (
    <div
      ref={wrapRef}
      className="pagewrap"
      style={{ width: pageSize.w * scale, height: pageSize.h * scale }}
      data-page={pageNum}
    >
      <div className="pagelabel">Page {pageNum}</div>
      {near ? (
        <>
          <canvas ref={canvasRef} />
          <div className="textlayer" ref={textRef} />
        </>
      ) : (
        <div className="pageskeleton" style={{ width: '100%', height: '100%' }}>{pageNum}</div>
      )}
      {near && groups.length > 0 && (
        <MarkLayer
          page={pageNum}
          groups={groups}
          width={pageSize.w}
          height={pageSize.h}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
