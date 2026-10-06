/**
 * Body shapes. Every shape is an outline in unit space (fits [-1,1]²) plus a
 * set of *anchors* so that eyes, cheeks, badges, hands and every accessory slot
 * land in the right place on that silhouette. All animations (squash, roll,
 * box-morph, explode, dance…) work on the outline, so they apply to every shape.
 *
 * Frames are expressed relative to the body half-extents (rx, ry):
 *   x_px = frame.cx * rx, y_px = frame.cy * ry, radii = frame.rx * rx / frame.ry * ry
 */

export interface Frame {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export type AccessorySlot = "head" | "face" | "neck" | "body";

export interface ShapeDef {
  id: ShapeId;
  label: string;
  /** Half-extents in units of R (R = 0.3 × canvas width). */
  ax: number;
  ay: number;
  /**
   * Optical size correction so every shape reads as the same size at the same
   * avatar size (measured from visible area; cube/orb shrink a little, bean/drop grow).
   */
  optical: number;
  /** True if the outline changes over time (blob wobble). */
  animated?: boolean;
  /** Unit-space outline, n points, closed. `t` = seconds (for animated shapes). */
  outline(n: number, t: number): Float32Array;
  /** Sphere the eyes are projected on (gives the 3D look-around). */
  face: Frame;
  /** Fitting frames per accessory slot. */
  frames: Record<AccessorySlot, Frame>;
  badge: { x: number; y: number };
  hands: { x: number; y: number };
  /** Cheek centre (mirrored) in body-unit space. */
  cheeks: { x: number; y: number };
}

export const SHAPE_IDS = ["orb", "soft", "pebble", "onigiri", "bean", "drop", "cube", "gem", "blob"] as const;
export type ShapeId = (typeof SHAPE_IDS)[number];

// ── outline generators ───────────────────────────────────────────────────────

function superellipse(n: number, exp: number, mod?: (a: number, ca: number, sa: number) => [number, number]) {
  const out = new Float32Array(n * 2);
  const e = 2 / exp;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    let x = Math.sign(ca) * Math.pow(Math.abs(ca), e);
    let y = Math.sign(sa) * Math.pow(Math.abs(sa), e);
    if (mod) [x, y] = mod(a, x, y);
    out[i * 2] = x;
    out[i * 2 + 1] = y;
  }
  return out;
}

/** Rounded convex polygon; vertices in unit space, corner radius r. Normalised to [-1,1]². */
function roundedPolygon(verts: [number, number][], r: number, n: number) {
  const m = verts.length;
  // outward edge normals
  const normals: [number, number][] = [];
  for (let i = 0; i < m; i++) {
    const [x0, y0] = verts[i];
    const [x1, y1] = verts[(i + 1) % m];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L = Math.hypot(dx, dy);
    normals.push([dy / L, -dx / L]); // clockwise in screen space (y down) ⇒ outward
  }
  // check orientation: outward normal should point away from centroid
  const cx = verts.reduce((s, v) => s + v[0], 0) / m;
  const cy = verts.reduce((s, v) => s + v[1], 0) / m;
  const mid0 = [(verts[0][0] + verts[1][0]) / 2, (verts[0][1] + verts[1][1]) / 2];
  if ((mid0[0] - cx) * normals[0][0] + (mid0[1] - cy) * normals[0][1] < 0) {
    for (const nn of normals) { nn[0] = -nn[0]; nn[1] = -nn[1]; }
  }
  const pts: [number, number][] = [];
  const perCorner = Math.max(4, Math.floor(n / m));
  for (let i = 0; i < m; i++) {
    const nPrev = normals[(i - 1 + m) % m];
    const nNext = normals[i];
    // inset centre along the bisector so the arc is tangent to both edges
    const bx = nPrev[0] + nNext[0];
    const by = nPrev[1] + nNext[1];
    const bl = Math.hypot(bx, by);
    const cosHalf = bl / 2;
    const d = r / cosHalf;
    const ccx = verts[i][0] - (bx / bl) * d;
    const ccy = verts[i][1] - (by / bl) * d;
    const a0 = Math.atan2(nPrev[1], nPrev[0]);
    let a1 = Math.atan2(nNext[1], nNext[0]);
    // go the short way around
    let da = a1 - a0;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    for (let k = 0; k < perCorner; k++) {
      const a = a0 + (da * k) / (perCorner - 1);
      pts.push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]);
    }
    a1 = a0 + da;
  }
  // resample to exactly n points by arc length so morphs stay smooth
  const seglen: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seglen.push(l);
    total += l;
  }
  const out = new Float32Array(n * 2);
  let si = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total;
    while (acc + seglen[si] < target && si < pts.length - 1) { acc += seglen[si]; si++; }
    const a = pts[si];
    const b = pts[(si + 1) % pts.length];
    const f = seglen[si] > 0 ? (target - acc) / seglen[si] : 0;
    out[k * 2] = a[0] + (b[0] - a[0]) * f;
    out[k * 2 + 1] = a[1] + (b[1] - a[1]) * f;
  }
  return normalise(out);
}

/** Centre the bbox on 0 and scale to fit [-1,1]² (independently per axis). */
function normalise(pts: Float32Array) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]);
    minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1]);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, sx = (maxX - minX) / 2, sy = (maxY - minY) / 2;
  for (let i = 0; i < pts.length; i += 2) {
    pts[i] = (pts[i] - cx) / sx;
    pts[i + 1] = (pts[i + 1] - cy) / sy;
  }
  return pts;
}

function teardrop(n: number) {
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    // rounded tip: a minimum width near t=0 keeps the point soft
    const w = 0.28 + 0.72 * Math.pow(Math.abs(Math.sin(t / 2)), 1.35);
    out[i * 2] = Math.sin(t) * w;
    out[i * 2 + 1] = -Math.cos(t);
  }
  // reorder so index 0 is at angle 0 (right side) like the other shapes — keeps morphs aligned
  return normalise(rotateStart(out));
}

function rotateStart(pts: Float32Array) {
  const n = pts.length / 2;
  let best = 0, bestScore = -Infinity;
  for (let i = 0; i < n; i++) {
    const score = pts[i * 2] - Math.abs(pts[i * 2 + 1]) * 0.5;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  const out = new Float32Array(pts.length);
  for (let k = 0; k < n; k++) {
    const j = (best + k) % n;
    out[k * 2] = pts[j * 2];
    out[k * 2 + 1] = pts[j * 2 + 1];
  }
  // ensure same winding as superellipse (angle increasing, y-down ⇒ clockwise on screen)
  const cross = out[0] * out[3] - out[1] * out[2];
  if (cross < 0) {
    const rev = new Float32Array(out.length);
    for (let k = 0; k < n; k++) {
      const j = (n - k) % n;
      rev[k * 2] = out[j * 2];
      rev[k * 2 + 1] = out[j * 2 + 1];
    }
    return rev;
  }
  return out;
}

const cache = new Map<string, Float32Array>();
function cached(key: string, make: () => Float32Array) {
  let v = cache.get(key);
  if (!v) { v = make(); cache.set(key, v); }
  return v;
}

// ── frames shared by round-ish shapes ────────────────────────────────────────
const FULL: Frame = { cx: 0, cy: 0, rx: 1, ry: 1 };
const roundFrames = (over: Partial<Record<AccessorySlot, Frame>> = {}): Record<AccessorySlot, Frame> => ({
  head: FULL, face: FULL, neck: FULL, body: FULL, ...over,
});

export const SHAPES: Record<ShapeId, ShapeDef> = {
  orb: {
    id: "orb", label: "Orb", optical: 0.971, ax: 1, ay: 1,
    outline: (n) => cached(`orb${n}`, () => superellipse(n, 2)),
    face: { cx: 0, cy: 0, rx: 1, ry: 1 },
    frames: roundFrames(),
    badge: { x: -0.72, y: -0.72 },
    hands: { x: 1.04, y: 0.6 },
    cheeks: { x: 0.56, y: 0.26 },
  },
  soft: {
    id: "soft", label: "Soft", optical: 1.033, ax: 1.14, ay: 0.88,
    outline: (n) => cached(`soft${n}`, () => superellipse(n, 2.7)),
    face: FULL,
    frames: roundFrames(),
    badge: { x: -0.63, y: -0.82 },
    hands: { x: 1.08, y: 0.7 },
    cheeks: { x: 0.55, y: 0.2 },
  },
  pebble: {
    id: "pebble", label: "Pebble", optical: 1.016, ax: 1.1, ay: 0.92,
    outline: (n) => cached(`pebble${n}`, () => normalise(superellipse(n, 2.35, (a, x, y) => {
      const k = 1 + 0.05 * Math.sin(2 * a + 0.7) + 0.03 * Math.cos(3 * a - 0.4);
      const widen = 1 + 0.08 * Math.max(0, y); // fuller at the bottom
      return [x * k * widen, y * k];
    }))),
    face: { cx: 0.02, cy: 0.02, rx: 0.98, ry: 0.98 },
    frames: roundFrames({ head: { cx: 0.03, cy: 0.03, rx: 0.96, ry: 0.97 } }),
    badge: { x: -0.66, y: -0.74 },
    hands: { x: 1.08, y: 0.62 },
    cheeks: { x: 0.55, y: 0.26 },
  },
  onigiri: {
    id: "onigiri", label: "Onigiri", optical: 1.016, ax: 1.1, ay: 1.0,
    outline: (n) => cached(`onigiri${n}`, () => rotateStart(roundedPolygon([[0, -1], [1, 0.82], [-1, 0.82]], 0.46, n))),
    face: { cx: 0, cy: 0.28, rx: 0.66, ry: 0.62 },
    frames: {
      head: { cx: 0, cy: -0.34, rx: 0.64, ry: 0.64 },
      face: { cx: 0, cy: 0.28, rx: 0.66, ry: 0.62 },
      neck: { cx: 0, cy: 0.3, rx: 0.86, ry: 0.72 },
      body: FULL,
    },
    badge: { x: -0.5, y: -0.36 },
    hands: { x: 0.98, y: 0.68 },
    cheeks: { x: 0.5, y: 0.52 },
  },
  bean: {
    id: "bean", label: "Bean", optical: 1.05, ax: 0.84, ay: 1.08,
    outline: (n) => cached(`bean${n}`, () => superellipse(n, 2.25)),
    face: { cx: 0, cy: -0.14, rx: 1, ry: 0.86 },
    frames: roundFrames({
      head: { cx: 0, cy: -0.12, rx: 1, ry: 0.88 },
      face: { cx: 0, cy: -0.14, rx: 1, ry: 0.86 },
      neck: { cx: 0, cy: 0.12, rx: 1, ry: 0.82 },
    }),
    badge: { x: -0.74, y: -0.7 },
    hands: { x: 1.1, y: 0.42 },
    cheeks: { x: 0.56, y: 0.12 },
  },
  drop: {
    id: "drop", label: "Drop", optical: 1.039, ax: 1.0, ay: 1.1,
    outline: (n) => cached(`drop${n}`, () => teardrop(n)),
    face: { cx: 0, cy: 0.26, rx: 0.86, ry: 0.72 },
    frames: {
      head: { cx: 0, cy: -0.26, rx: 0.72, ry: 0.68 },
      face: { cx: 0, cy: 0.26, rx: 0.86, ry: 0.72 },
      neck: { cx: 0, cy: 0.26, rx: 0.96, ry: 0.72 },
      body: FULL,
    },
    badge: { x: -0.56, y: -0.16 },
    hands: { x: 1.02, y: 0.62 },
    cheeks: { x: 0.5, y: 0.48 },
  },
  cube: {
    id: "cube", label: "Cube", optical: 0.929, ax: 1.02, ay: 0.96,
    outline: (n) => cached(`cube${n}`, () => superellipse(n, 4.4)),
    face: FULL,
    frames: roundFrames({ head: { cx: 0, cy: 0.02, rx: 1.04, ry: 1 } }),
    badge: { x: -0.82, y: -0.82 },
    hands: { x: 1.06, y: 0.62 },
    cheeks: { x: 0.56, y: 0.26 },
  },
  gem: {
    id: "gem", label: "Gem", optical: 1.02, ax: 1.06, ay: 0.94,
    outline: (n) => cached(`gem${n}`, () => rotateStart(roundedPolygon(
      [[-1, 0], [-0.5, -0.87], [0.5, -0.87], [1, 0], [0.5, 0.87], [-0.5, 0.87]].map(([x, y]) => [x, y] as [number, number]),
      0.26, n,
    ))),
    face: { cx: 0, cy: 0, rx: 0.96, ry: 0.98 },
    frames: roundFrames({ head: { cx: 0, cy: 0.04, rx: 0.92, ry: 0.96 } }),
    badge: { x: -0.62, y: -0.78 },
    hands: { x: 1.04, y: 0.56 },
    cheeks: { x: 0.54, y: 0.26 },
  },
  blob: {
    id: "blob", label: "Blob", optical: 1.009, ax: 1.1, ay: 0.92, animated: true,
    outline: (n, t) => superellipse(n, 2.5, (a, x, y) => {
      const k = 1 + 0.035 * Math.sin(3 * a + t * 1.3) + 0.025 * Math.sin(5 * a - t * 0.9) + 0.02 * Math.sin(2 * a + t * 0.7);
      return [x * k, y * k];
    }),
    face: FULL,
    frames: roundFrames(),
    badge: { x: -0.66, y: -0.78 },
    hands: { x: 1.1, y: 0.62 },
    cheeks: { x: 0.55, y: 0.24 },
  },
};
