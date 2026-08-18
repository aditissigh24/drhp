/**
 * Hand-drawn mark geometry. A reviewer's pen never draws a perfect ellipse,
 * and a perfect one reads as a UI chrome element rather than an annotation —
 * so both shapes carry a small, *stable* wobble seeded from the fact id.
 */

const seedFrom = (id) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Deterministic PRNG so a mark looks identical on every re-render. */
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const smooth = (pts) => {
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
};

/**
 * An open loop drawn slightly past a full turn, the way a pen circles a number.
 * `rect` is in rendered pixels.
 */
export function circlePath(rect, id) {
  const r = rng(seedFrom(id));
  const padX = Math.max(5, rect.w * 0.12);
  const padY = Math.max(4, rect.h * 0.3);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const rx = rect.w / 2 + padX;
  const ry = rect.h / 2 + padY;

  const start = -0.55 + (r() - 0.5) * 0.4;   // start near the top-right
  const turn = Math.PI * 2 + 0.42 + r() * 0.3; // overshoot past the join
  const steps = 34;
  const tilt = (r() - 0.5) * 0.1;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = start + (turn * i) / steps;
    // Two slow harmonics keep the wobble organic instead of noisy.
    const wobble = 1 + 0.035 * Math.sin(t * 2.3 + r0(id)) + 0.022 * Math.sin(t * 3.7);
    const x = Math.cos(t) * rx * wobble;
    const y = Math.sin(t) * ry * wobble;
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  return smooth(pts);
}

// Stable per-id phase offset for the wobble.
const r0 = (id) => (seedFrom(id) % 628) / 100;

/** A single stroke under a line of text, with a gentle drift. */
export function underlinePath(rect, id, index = 0) {
  const r = rng(seedFrom(id) + index * 7919);
  const y = rect.baselineY + Math.max(2.5, rect.h * 0.16);
  const steps = Math.max(6, Math.round(rect.w / 26));
  const amp = Math.min(1.9, 0.7 + rect.h * 0.07);
  const phase = r() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = rect.x - 1 + (rect.w + 2) * t;
    // Taper the wobble at both ends so the stroke starts and lands cleanly.
    const taper = Math.sin(Math.PI * t) ** 0.5;
    pts.push([x, y + Math.sin(t * 5.5 + phase) * amp * taper + (r() - 0.5) * 0.5]);
  }
  return smooth(pts);
}
