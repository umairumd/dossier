/* eslint-disable prefer-const */
/**
 * Accessory renderer — port of Coucou's design/outfits/mochi-outfits.js (MIT code),
 * typed and extended. Accessories are modelled on a 3D head (a superellipsoid) so
 * they wrap correctly as the head turns. The engine hands each accessory a *fitting
 * frame* (Head) per slot and per body shape, plus the real eye positions, so hats sit
 * on the crown of a triangle as well as a circle and glasses always land on the eyes.
 */
import type { AccessorySlot } from "../shapes";

type Ctx = CanvasRenderingContext2D;
type P3 = [number, number, number];
interface Q { x: number; y: number; z: number }
type RingPt = Q & { lon: number };
type Stops = [number, string][];

export interface EyeFrame {
  sd: number; visible: boolean; x: number; y: number; fx: number; fy: number; w: number; h: number;
}
export interface Head {
  R: number; rx: number; ry: number; view: number; yaw: number; pitch: number;
  phys: { dx: number; dy: number };
  /** Real eye frames (in this head's coordinates) — glasses use these when present. */
  eyes?: EyeFrame[];
  /** Body centre in this head's coordinates (for items cut from the body silhouette). */
  body?: { x: number; y: number };
  /** The head frame (where hats sit) in this slot's coordinates — for ears/bumps on any shape. */
  crown?: { x: number; y: number; rx: number; ry: number };
  /** Copied from OutfitDef.viewMax by the engine. */
  viewMax?: number;
}
export interface OutfitDef {
  slot: AccessorySlot;
  /**
   * "wrap" (default) fits the full width of the head frame (beanie, santa hat, headphones).
   * "crown" sits on top of the head at a natural width, so wide bodies don't stretch it
   * (crown, party hat, grad cap, witch hat, halo).
   */
  fit?: "wrap" | "crown";
  /**
   * Lowest on-screen point (head-local px, y down) of the item's front edge. The engine
   * keeps the eyes below it, so a hat can never cover the eyes — even at extreme gaze.
   */
  brimY?(H: Head): number;
  /** Cap on how far the item tips back when looking up (radians; default 0.05). */
  viewMax?: number;
  back?(ctx: Ctx, H: Head): void;
  /** Drawn on the body, under cheeks and eyes (skin patterns). Clip to `path` yourself. */
  under?(ctx: Ctx, H: Head, path: Path2D): void;
  front?(ctx: Ctx, H: Head, path: Path2D): void;
  /** Skins only: eye colour while worn (e.g. white eyes inside panda patches). */
  eyeInk?: string;
  frontAfterEyes?: boolean;
  bodyColors?: [string, string];
}

// Mochi outfit reference renderer (Canvas 2D).
// Coordinates mirror BotEngine.draw(): origin at body centre, y down on screen,
// R = W*0.3, rx = 1.14R, ry = 0.88R. Head "3D" model: superellipsoid whose
// horizontal radius at height y (y up, -1..1) is r(y) = (1-|y|^2.7)^(1/2.7),
// so that its silhouette matches mochiPath at yaw = pitch = 0.

const EXP = 2.7;
// Accessories are seen slightly from above (and hats sit tipped forward): rings show as ellipses.
const VIEW_TILT = -0.30;
const ACC_PITCH = 0.5, ACC_PITCH_UP = 0.8;
const EYE_W = 0.25, EYE_H = 0.27, EYE_SP = 0.37, EYE_P = -0.12;

function ringR(y: number): number { const a = Math.min(1, Math.abs(y)); return Math.pow(1 - Math.pow(a, EXP), 1 / EXP); }

// rotate a head-local point (x right, y up, z toward viewer) by yaw then pitch
function rot(p: P3, yaw: number, pitch: number): P3 {
  let [x, y, z] = p;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  let y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp;
  return [x1, y2, z2];
}
// head-local -> screen (body space). returns {x, y, z}
// Accessories tip back with the head when it looks up (so hats ride up with the eyes) and
// forward a little when it looks down; the view is clamped so a hat never shows its underside.
function viewAngle(H: Head): number {
  const v = (H.view ?? VIEW_TILT) + H.pitch * (H.pitch > 0 ? ACC_PITCH_UP : ACC_PITCH);
  return Math.max(-0.62, Math.min(H.viewMax ?? 0.05, v));
}
function proj(H: Head, p: P3): Q {
  const r = rot(p, H.yaw, viewAngle(H));
  return { x: r[0] * H.rx, y: -r[1] * H.ry, z: r[2] };
}
// point on the head surface at height y, longitude lon (0 = facing viewer), scaled by s
function surf(y: number, lon: number, s = 1): P3 { const r = ringR(y) * s; return [r * Math.sin(lon), y, r * Math.cos(lon)]; }

function mochiPath(rx: number, ry: number): Path2D {
  const p = new Path2D(); const n = 96, e = 2 / EXP;
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const x = rx * Math.sign(ca) * Math.pow(Math.abs(ca), e);
    const y = ry * Math.sign(sa) * Math.pow(Math.abs(sa), e);
    if (i) p.lineTo(x, y); else p.moveTo(x, y);
  }
  p.closePath(); return p;
}

// FLAT STYLE: gradients collapse to one solid colour (the average of their opaque stops);
// translucent gloss/shadow overlays (any stop with alpha < 1) are dropped entirely.
function parseColor(c: string): [number, number, number, number] | null {
  const h = c.trim();
  if (h.startsWith('#')) {
    const v = h.slice(1);
    const f = v.length === 3 ? v.split('').map((ch) => ch + ch).join('') : v;
    const n = parseInt(f.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = h.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map((x) => parseFloat(x));
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
function flat(stops: Stops): string {
  const cs = stops.map(([, c]) => parseColor(c));
  if (cs.some((c) => !c || c[3] < 1)) return 'rgba(0,0,0,0)';
  const avg = [0, 1, 2].map((i) => Math.round(cs.reduce((t, c) => t + (c as number[])[i], 0) / cs.length));
  return `rgb(${avg.join(',')})`;
}
function lin(_ctx: Ctx, _x0: number, _y0: number, _x1: number, _y1: number, stops: Stops): string {
  return flat(stops);
}
function rad(_ctx: Ctx, _x: number, _y: number, _r0: number, _r1: number, stops: Stops): string {
  return flat(stops);
}

// Same formula as drawEyes(): spherical addition, NOT the rotation used for accessories.
function eyeFrames(H: Head): EyeFrame[] {
  if (H.eyes) return H.eyes;
  const out: EyeFrame[] = [];
  for (const sd of [-1, 1]) {
    const eyeYaw = sd * EYE_SP + H.yaw;
    let eyePitch = EYE_P + H.pitch;
    const cp = Math.cos(eyePitch);
    const visible = Math.cos(eyeYaw) * cp > 0.04;
    out.push({
      sd, visible,
      x: Math.sin(eyeYaw) * cp * H.rx,
      y: -Math.sin(eyePitch) * H.ry,
      fx: Math.max(0.18, Math.cos(eyeYaw)),
      fy: Math.max(0.18, cp),
      w: H.R * EYE_W, h: H.R * EYE_H,
    });
  }
  return out;
}
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- helpers for "wrapped" items ----------
// Front arc of a ring (height y, scale s) projected, from left extreme to right extreme (z >= 0 side).
function frontArc(H: Head, y: number, s: number, n = 64): RingPt[] {
  // Visible half of the ring, solved analytically: a fixed number of points between the two
  // silhouette longitudes. Continuous under yaw/pitch, so nothing pops in or out as it turns.
  const v = viewAngle(H), r = Math.max(1e-3, ringR(y) * s);
  const edge = Math.acos(Math.max(-1, Math.min(1, (y * Math.tan(v)) / r)));
  const pts: RingPt[] = [];
  for (let i = 0; i <= n; i++) { const lon = -H.yaw - edge + (2 * edge * i) / n; pts.push({ lon, ...proj(H, surf(y, lon, s)) }); }
  return pts;
}
/** Lowest on-screen point of the visible half of a ring — used for brimY(). */
function ringLow(H: Head, y: number, s: number): number {
  return frontArc(H, y, s, 24).reduce((m, q) => Math.max(m, q.y), -Infinity);
}
// region of the inflated head ABOVE the front arc of ring y (the part a cap covers)
function capClip(H: Head, y: number, s: number, extraTop = 3): Path2D {
  const arc = frontArc(H, y, s);
  const p = new Path2D();
  p.moveTo(arc[0].x - H.rx, arc[0].y);
  for (const q of arc) p.lineTo(q.x, q.y);
  p.lineTo(arc[arc.length - 1].x + H.rx, arc[arc.length - 1].y);
  p.lineTo(H.rx * 2, -H.ry * extraTop); p.lineTo(-H.rx * 2, -H.ry * extraTop); p.closePath();
  return p;
}
function strokeArc(ctx: Ctx, arc: { x: number; y: number }[]): void { ctx.beginPath(); arc.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); }

// soft round "pompom" made of overlapping puffs
function pompom(ctx: Ctx, x: number, y: number, r: number, base = '#FFFFFF', shade = '#D5D9E2'): void {
  ctx.save(); ctx.translate(x, y);
  // fluffy rim bumps
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, br = r * (0.34 + 0.06 * Math.sin(i * 2.3));
    const bx = Math.cos(a) * r * 0.78, by = Math.sin(a) * r * 0.78;
    ctx.fillStyle = rad(ctx, bx - br * 0.4, by - br * 0.5, 0, br * 1.3, [[0, base], [1, shade]]);
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = rad(ctx, -r * 0.3, -r * 0.35, 0, r * 1.05, [[0, base], [0.7, base], [1, shade]]);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// ---------- OUTFITS ----------
// Each outfit has optional back(ctx,H) (before body) and front(ctx,H,path) (after body+eyes).
// H.phys = {dx, dy}: spring lag of floppy parts in head units (driven by yaw velocity + gravity in Swift).

const OUTFITS: Record<string, OutfitDef> = {};

// --- Beanie: flat navy knit cap — solid dome, ribbed fold-up cuff, cream pompom.
// Cut from the body's own silhouette (grown a touch), so it hugs every shape: boxy on Cube,
// faceted on Gem, wobbly on Blob. The cuff lines are rings seen from slightly above that run
// all the way out to the body's edge, so there are no corners poking out and no kinks.
const BEANIE = { yEdge: 0.6, yCuff: 0.8, W: 1.2 };
function grownBody(H: Head, path: Path2D, kx: number, ky: number): Path2D {
  const c = H.body ?? { x: 0, y: 0 };
  const p = new Path2D();
  const gy = c.y - H.ry * 0.2; // grow about a point near the top so the cap gains height too
  p.addPath(path, new DOMMatrix().translate(c.x, gy).scale(kx, ky).translate(-c.x, -gy));
  return p;
}
// Lower (front) half of a horizontal ring at height y: half-width W (head units), depth = head ring.
// A round ring looks the same at any yaw, so this stays put while the head turns.
function bandArc(H: Head, y: number, n = 48): Q[] {
  const v = viewAngle(H), D = ringR(y), W = BEANIE.W, out: Q[] = [];
  for (let i = 0; i <= n; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / n;
    out.push({ x: Math.sin(t) * W * H.rx, y: -(y * Math.cos(v) + D * Math.cos(t) * Math.sin(v)) * H.ry, z: 1 });
  }
  return out;
}
function above(H: Head, arc: Q[]): Path2D {
  const p = new Path2D(), far = H.rx * 3;
  p.moveTo(arc[0].x - far, arc[0].y); arc.forEach((q) => p.lineTo(q.x, q.y));
  p.lineTo(arc[arc.length - 1].x + far, arc[arc.length - 1].y);
  p.lineTo(far * 2, -H.ry * 4); p.lineTo(-far * 2, -H.ry * 4); p.closePath();
  return p;
}
OUTFITS.beanie = {
  slot: 'head',
  brimY: (H) => bandArc(H, BEANIE.yEdge, 16).reduce((m, q) => Math.max(m, q.y), -Infinity),
  front(ctx: Ctx, H: Head, path: Path2D) {
    const { yEdge, yCuff } = BEANIE;
    const hat = grownBody(H, path, 1.05, 1.045);
    const edge = bandArc(H, yEdge), cuff = bandArc(H, yCuff);
    ctx.save(); ctx.clip(hat);
    // 1) whole hat in the cuff colour, 2) knit dome on top — one shared boundary, no gaps
    ctx.save(); ctx.clip(above(H, edge)); ctx.fillStyle = '#28324B'; ctx.fill(hat); ctx.restore();
    ctx.save(); ctx.clip(above(H, cuff)); ctx.fillStyle = '#34405E'; ctx.fill(hat);
    // knit ribs following the meridians (turn with the head)
    ctx.lineCap = 'round';
    for (let k = -7; k <= 7; k++) {
      const lon = k * 0.22; const pts: Q[] = [];
      for (let i = 0; i <= 14; i++) { const y = yCuff - 0.04 + (1.04 - yCuff) * i / 14; const q = proj(H, surf(y, lon, 1.04)); if (q.z > 0.05) pts.push(q); }
      if (pts.length < 2) continue;
      strokeArc(ctx, pts); ctx.strokeStyle = '#2C3651'; ctx.lineWidth = H.R * 0.04; ctx.stroke();
    }
    ctx.restore();
    // cuff ribs: short verticals between the two cuff lines
    ctx.save(); ctx.clip(above(H, edge)); ctx.strokeStyle = '#212A40'; ctx.lineWidth = H.R * 0.035; ctx.lineCap = 'round';
    for (let i = 2; i < edge.length - 2; i += 2) {
      const a = edge[i], b = cuff[i];
      ctx.beginPath(); ctx.moveTo(a.x, a.y - H.R * 0.04); ctx.lineTo(b.x, b.y + H.R * 0.04); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    // pompom on a short spring, sitting on the top of the cap
    const top = proj(H, [0, 1.04, 0]);
    pompom(ctx, top.x + H.phys.dx * H.rx * 0.25, top.y - H.R * 0.08 + H.phys.dy * H.ry * 0.15, H.R * 0.22, '#F3E9DA', '#F3E9DA');
  }
};

// --- Santa hat: soft red bag that flops to the side, smooth white trim, pompom at the tip
const SANTA = { s: 1.05, yEdge: 0.62, trim: 0.26 };
OUTFITS.santaHat = {
  slot: 'head',
  brimY: (H) => ringLow(H, SANTA.yEdge, SANTA.s) + H.R * SANTA.trim * 0.5,
  front(ctx: Ctx, H: Head) {
    const { s, yEdge, trim } = SANTA;
    const arc = frontArc(H, yEdge, s, 72);
    const L = arc[0], Rt = arc[arc.length - 1];
    const crown = proj(H, [0, 1.02, 0]);
    // tip: flops to the right and down, plus spring lag
    const tip = { x: crown.x + H.rx * (0.9 + H.phys.dx * 0.35), y: crown.y + H.ry * (0.12 + H.phys.dy * 0.2) };
    const peak = { x: crown.x + H.rx * 0.22, y: crown.y - H.ry * 0.6 };
    const bag = new Path2D();
    bag.moveTo(L.x, L.y);
    bag.bezierCurveTo(L.x - H.rx * 0.04, L.y - H.ry * 0.62, peak.x - H.rx * 0.55, peak.y - H.ry * 0.04, peak.x, peak.y);
    bag.quadraticCurveTo(tip.x - H.rx * 0.08, peak.y, tip.x, tip.y);
    bag.quadraticCurveTo(tip.x - H.rx * 0.14, tip.y - H.ry * 0.16, peak.x + H.rx * 0.2, peak.y + H.ry * 0.34);
    bag.bezierCurveTo(Rt.x + H.rx * 0.04, peak.y + H.ry * 0.46, Rt.x + H.rx * 0.06, Rt.y - H.ry * 0.3, Rt.x, Rt.y);
    for (let i = arc.length - 1; i >= 0; i--) bag.lineTo(arc[i].x, arc[i].y);
    bag.closePath();
    ctx.fillStyle = '#E5484D'; ctx.fill(bag);
    // one soft fold, solid
    ctx.save(); ctx.clip(bag); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(peak.x + H.rx * 0.05, peak.y + H.ry * 0.16);
    ctx.quadraticCurveTo(peak.x + H.rx * 0.38, peak.y + H.ry * 0.12, tip.x - H.rx * 0.22, tip.y - H.ry * 0.06);
    ctx.strokeStyle = '#C9353A'; ctx.lineWidth = H.R * 0.07; ctx.stroke();
    ctx.restore();
    // trim: one smooth rounded band along the brim (no per-frame bumps that flicker)
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    strokeArc(ctx, arc); ctx.strokeStyle = '#F4F5F8'; ctx.lineWidth = H.R * trim; ctx.stroke();
    ctx.restore();
    pompom(ctx, tip.x, tip.y + H.R * 0.04, H.R * 0.2, '#F4F5F8', '#F4F5F8');
  }
};

// --- Party hat: chubby cone centred on the crown, gentle tilt, tidy dot rows, gold rim + pompom
OUTFITS.partyHat = {
  slot: 'head',
  fit: 'crown',
  brimY: (H) => partyGeom(H).low,
  front(ctx: Ctx, H: Head) {
    const g = partyGeom(H);
    const { left, right, apex, front } = g;
    const cone = new Path2D();
    cone.moveTo(left.x, left.y);
    cone.quadraticCurveTo((left.x + apex.x) / 2 - H.R * 0.04, (left.y + apex.y) / 2, apex.x - H.R * 0.05, apex.y + H.R * 0.07);
    cone.quadraticCurveTo(apex.x, apex.y - H.R * 0.02, apex.x + H.R * 0.05, apex.y + H.R * 0.07);
    cone.quadraticCurveTo((right.x + apex.x) / 2 + H.R * 0.04, (right.y + apex.y) / 2, right.x, right.y);
    for (let i = front.length - 1; i >= 0; i--) cone.lineTo(front[i].x, front[i].y);
    cone.closePath();
    ctx.fillStyle = '#EC4899'; ctx.fill(cone);
    // dots in tidy rows (fewer near the tip), clipped to the cone
    ctx.save(); ctx.clip(cone);
    const rows: [number, number[]][] = [[0.2, [-0.5, 0, 0.5]], [0.48, [-0.28, 0.28]], [0.72, [0]]];
    for (const [t, us] of rows) {
      for (const u of us) {
        const bx = (left.x + right.x) / 2 + (right.x - left.x) * 0.5 * u, by = (left.y + right.y) / 2 + (right.y - left.y) * 0.5 * u;
        const x = bx + (apex.x - bx) * t, y = by + (apex.y - by) * t;
        ctx.beginPath(); ctx.arc(x, y, H.R * 0.062 * (1 - t * 0.4), 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      }
    }
    ctx.restore();
    // rim along the visible front of the base
    ctx.save(); strokeArc(ctx, front); ctx.strokeStyle = '#FACC15'; ctx.lineWidth = H.R * 0.09; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    pompom(ctx, apex.x, apex.y - H.R * 0.02, H.R * 0.15, '#FACC15', '#FACC15');
  }
};
function partyGeom(H: Head) {
  const by = 0.8, bx = 0.1, br = 0.44, lean = -0.16 + H.phys.dx * 0.12;
  const c = proj(H, [bx, by, 0]);
  const N = 64; const ring: Q[] = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; ring.push(proj(H, [bx + br * Math.sin(a), by, br * Math.cos(a)])); }
  let iL = 0, iR = 0, iF = 0;
  ring.forEach((q, i) => { if (q.x < ring[iL].x) iL = i; if (q.x > ring[iR].x) iR = i; if (q.z > ring[iF].z) iF = i; });
  // walk from left to right through the front-most point
  const walk = (dir: number) => { const out: Q[] = []; for (let k = 0, i = iL; k <= N; k++, i = (i + dir + N) % N) { out.push(ring[i]); if (i === iR) break; } return out; };
  const a = walk(1), b = walk(-1);
  const front = a.includes(ring[iF]) ? a : b;
  const h = H.ry * 1.3;
  const apex = { x: c.x + Math.sin(lean) * h, y: c.y - Math.cos(lean) * h };
  const low = front.reduce((m, q) => Math.max(m, q.y), -Infinity) + H.R * 0.045;
  return { left: ring[iL], right: ring[iR], apex, front, low };
}

// --- Crown: golden band AROUND the head, spikes all around (back ones behind the head)
function crownGeom() {
  const s = 1.05, yb = 0.6, yt = 0.76, n = 8;
  return { s, yb, yt, n, spikeH: 0.36 };
}
function crownPart(ctx: Ctx, H: Head, side: number): void { // side: -1 back half, +1 front half
  const { s, yb, yt, n, spikeH } = crownGeom();
  const N = 64; const seg = [];
  for (let i = 0; i <= N; i++) {
    const lon = -Math.PI + i / N * 2 * Math.PI;
    const b = proj(H, surf(yb, lon, s)), t = proj(H, surf(yt, lon, s));
    const phase = ((lon + Math.PI) / (2 * Math.PI)) * n; const f = phase - Math.floor(phase);
    const spike = Math.pow(Math.max(0, 1 - Math.abs(f - 0.5) * 2), 1.6); // 0..1 peak at middle
    const topY = yt + spikeH * spike;
    const tt = proj(H, [surf(yt, lon, s)[0] * (1 - 0.08 * spike), topY, surf(yt, lon, s)[2] * (1 - 0.08 * spike)]);
    seg.push({ lon, b, t, tt, z: b.z, spike });
  }
  const keep = seg.filter(q => side > 0 ? q.z >= 0 : q.z < 0.02);
  if (keep.length < 2) return;
  keep.sort((a, b) => a.b.x - b.b.x);
  const shape = new Path2D();
  keep.forEach((q, i) => i ? shape.lineTo(q.tt.x, q.tt.y) : shape.moveTo(q.tt.x, q.tt.y));
  for (let i = keep.length - 1; i >= 0; i--) shape.lineTo(keep[i].b.x, keep[i].b.y);
  shape.closePath();
  const dark = side < 0;
  ctx.fillStyle = lin(ctx, 0, -H.ry * 1.05, 0, -H.ry * 0.45, dark ? [[0, '#C98A12'], [1, '#8A5A06']] : [[0, '#FFE58A'], [0.5, '#FBBF24'], [1, '#D08A0B']]);
  ctx.fill(shape);
  if (!dark) {
    // band highlight + gems + ball tips on front spikes
    ctx.save(); ctx.clip(shape);
    ctx.fillStyle = lin(ctx, -H.rx, 0, H.rx, 0, [[0, 'rgba(120,70,0,0.25)'], [0.45, 'rgba(255,255,255,0.0)'], [0.62, 'rgba(255,255,255,0.35)'], [1, 'rgba(120,70,0,0.25)']]);
    ctx.fill(shape); ctx.restore();
    const gems = ['#EF4444', '#3B82F6', '#22C55E', '#A855F7'];
    for (let k = 0; k < n; k++) {
      const lon = -Math.PI + (k + 0.5) / n * 2 * Math.PI;
      const sp = surf(yt, lon, s);
      const tipP = proj(H, [sp[0] * 0.92, yt + spikeH, sp[2] * 0.92]);
      const mid = proj(H, surf((yb + yt) / 2, lon, s * 1.01));
      if (mid.z <= 0.12) continue;
      const r = H.R * 0.055;
      ctx.beginPath(); ctx.arc(tipP.x, tipP.y - r * 0.5, r, 0, Math.PI * 2);
      ctx.fillStyle = rad(ctx, tipP.x - r * 0.3, tipP.y - r, 0, r * 1.2, [[0, '#FFF6CC'], [1, '#E0A21A']]); ctx.fill();
      const gr = H.R * 0.075;
      ctx.beginPath(); ctx.ellipse(mid.x, mid.y, gr * Math.max(0.35, mid.z), gr, 0, 0, Math.PI * 2);
      ctx.fillStyle = gems[k % gems.length]; ctx.fill();
      ctx.beginPath(); ctx.arc(mid.x - gr * 0.25 * mid.z, mid.y - gr * 0.35, gr * 0.28, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    }
  }
}
OUTFITS.crown = {
  slot: 'head',
  fit: 'crown',
  brimY: (H) => ringLow(H, crownGeom().yb, crownGeom().s),
  back(ctx: Ctx, H: Head) { crownPart(ctx, H, -1); },
  front(ctx: Ctx, H: Head) { crownPart(ctx, H, 1); }
};

// --- Witch hat: wide brim around the head, tall cone with a softly curled tip, orange band + gold buckle.
// The hat is always seen a little from above (viewMax), so the brim never collapses into a flat
// line when the buddy looks up — the eyes simply stop under the brim instead.
const WITCH = { y: 0.74, rr: 1.32, baseR: 0.56, view: -0.24 };
function witchBrimPts(H: Head): (Q & { a: number })[] {
  const { y, rr } = WITCH; const pts = [];
  for (let i = 0; i <= 72; i++) {
    const a = -Math.PI + i / 72 * 2 * Math.PI;
    const wob = 1 + 0.03 * Math.sin(a * 3 + 0.6);
    const droop = -0.08 * Math.pow(Math.abs(Math.sin(a)), 2); // brim edges droop a little
    pts.push({ a, ...proj(H, [rr * wob * Math.sin(a), y + droop, rr * wob * Math.cos(a)]) });
  }
  return pts;
}
function brimPath(H: Head): Path2D {
  const p = new Path2D(); witchBrimPts(H).forEach((q, i) => i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)); p.closePath(); return p;
}
interface WitchColors {
  brimBack: string;
  brim: string;
  cone: string;
  /** Outline for brim and cone; the cone colour gives the classic soft edge. */
  edge: string;
  band: string;
  /** Gold buckle (seasonal hat) or a small silver star (night hat). */
  emblem: 'buckle' | 'star';
}

function fivePointStar(ctx: Ctx, x: number, y: number, r: number, sx: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr * sx, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function witchHatOutfit(c: WitchColors): OutfitDef {
  return {
    slot: 'head',
    fit: 'crown',
    viewMax: WITCH.view,
    brimY: (H) => witchBrimPts(H).filter((q) => q.z >= 0).reduce((m, q) => Math.max(m, q.y), -Infinity) + H.R * 0.04,
    back(ctx: Ctx, H: Head) {
      ctx.fillStyle = c.brimBack; ctx.fill(brimPath(H));
    },
    front(ctx: Ctx, H: Head) {
      const { baseR } = WITCH; const by = WITCH.y + 0.03;
      // brim (whole ellipse: it covers the crown of the head around the cone)
      const brim = brimPath(H);
      ctx.fillStyle = c.brim; ctx.fill(brim);
      if (c.edge !== c.brim) {
        ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = c.edge; ctx.lineWidth = H.R * 0.03; ctx.stroke(brim); ctx.restore();
      }
      // cone base = visible front of the base ring; its ends are the cone's true silhouette,
      // so the cone keeps its width as the head turns
      const base = frontArc(H, by, baseR / ringR(by), 40);
      const bl = base[0], br = base[base.length - 1];
      const cx = (bl.x + br.x) / 2, cy = (bl.y + br.y) / 2;
      const w = (br.x - bl.x) / 2;
      const sway = H.phys.dx * 0.18;
      const top = { x: cx + w * (0.22 + sway), y: cy - H.ry * 1.18 };
      const tip = { x: top.x + w * (0.78 + sway * 1.5), y: top.y + H.ry * (0.2 + H.phys.dy * 0.08) };
      const cone = new Path2D();
      cone.moveTo(bl.x, bl.y);
      cone.bezierCurveTo(bl.x - w * 0.02, bl.y - H.ry * 0.36, top.x - w * 0.42, top.y + H.ry * 0.34, top.x - w * 0.1, top.y + H.ry * 0.04);
      // curl over the top and down to a rounded point
      cone.bezierCurveTo(top.x + w * 0.08, top.y - H.ry * 0.12, tip.x - w * 0.12, tip.y - H.ry * 0.16, tip.x, tip.y);
      cone.bezierCurveTo(tip.x - w * 0.22, tip.y - H.ry * 0.06, top.x + w * 0.3, top.y + H.ry * 0.02, top.x + w * 0.24, top.y + H.ry * 0.26);
      cone.bezierCurveTo(top.x + w * 0.22, cy - H.ry * 0.52, br.x + w * 0.02, br.y - H.ry * 0.3, br.x, br.y);
      for (let i = base.length - 1; i >= 0; i--) cone.lineTo(base[i].x, base[i].y);
      cone.closePath();
      ctx.save();
      ctx.fillStyle = c.cone; ctx.fill(cone);
      // a round-joined stroke rounds off the tip and the corners (and draws the edge)
      ctx.lineJoin = 'round'; ctx.strokeStyle = c.edge; ctx.lineWidth = H.R * 0.05; ctx.stroke(cone);
      // band: follows the front of the cone (a lifted copy of the base curve)
      const lift = H.ry * 0.12;
      ctx.clip(cone);
      // a filled strip between two lifted copies of the base curve, extended sideways and cut by
      // the cone — no stroke caps, so nothing pokes out at the cone's edges or below the cone
      const lo = lift - H.ry * 0.08, hi = lift + H.ry * 0.08, far = H.rx * 2, n = base.length - 1;
      ctx.beginPath();
      ctx.moveTo(base[0].x - far, base[0].y - lo); base.forEach((q) => ctx.lineTo(q.x, q.y - lo)); ctx.lineTo(base[n].x + far, base[n].y - lo);
      ctx.lineTo(base[n].x + far, base[n].y - hi); for (let i = n; i >= 0; i--) ctx.lineTo(base[i].x, base[i].y - hi); ctx.lineTo(base[0].x - far, base[0].y - hi);
      ctx.closePath(); ctx.fillStyle = c.band; ctx.fill();
      ctx.restore();
      // emblem on the front of the band, turning with the head
      const f = proj(H, [0, by, baseR]);
      const face = Math.cos(H.yaw);
      if (f.z > 0 && face > 0.2) {
        ctx.save(); ctx.translate(f.x, f.y - lift);
        if (c.emblem === 'buckle') {
          const bw = H.R * 0.2 * face, bh = H.R * 0.16;
          roundRect(ctx, -bw / 2, -bh / 2, bw, bh, Math.min(bw, bh) * 0.25); ctx.fillStyle = '#FCD34D'; ctx.fill();
          roundRect(ctx, -bw / 2 + bw * 0.24, -bh / 2 + bh * 0.28, bw * 0.52, bh * 0.44, bh * 0.1); ctx.fillStyle = '#C2410C'; ctx.fill();
        } else {
          fivePointStar(ctx, 0, 0, H.R * 0.085, face);
          ctx.fillStyle = '#E4E7EC'; ctx.fill();
          ctx.lineJoin = 'round'; ctx.strokeStyle = '#B8BEC8'; ctx.lineWidth = H.R * 0.012; ctx.stroke();
        }
        ctx.restore();
      }
    },
  };
}

// Seasonal: purple, orange band, gold buckle.
OUTFITS.witchHat = witchHatOutfit({
  brimBack: '#3B1478', brim: '#4C1D95', cone: '#5B21B6', edge: '#5B21B6', band: '#F97316', emblem: 'buckle',
});
// Awarded: the same hat at night. Near-black with a slightly lighter edge so it reads on the
// dark app, a deep teal band and a small silver star. No shine.
OUTFITS.nightWitchHat = witchHatOutfit({
  brimBack: '#0B0A0F', brim: '#16141C', cone: '#1B1922', edge: '#3A3644', band: '#1F5F5B', emblem: 'star',
});

// --- Glasses pinned to the real eye positions
// Lens size follows the eye spacing so the two lenses never merge when the eyes sit close:
// a minimum gap of ~16% of the centre distance is always kept for the bridge.
function lensSpan(_H: Head, eyes: EyeFrame[], max: number): number {
  const [l, r] = eyes;
  const dist = Math.abs(r.x - l.x) / Math.max(0.35, (l.fx + r.fx) / 2);
  return Math.min(max, dist * 0.84);
}
function lens(ctx: Ctx, e: EyeFrame, w: number, h: number, r: number): void { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.fx, e.fy); roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.restore(); }
OUTFITS.sunglasses = {
  slot: 'face',
  frontAfterEyes: true,
  front(ctx: Ctx, H: Head, path: Path2D) {
    const eyes = eyeFrames(H);
    const w = lensSpan(H, eyes, H.R * 0.62), h = Math.max(H.R * 0.36, Math.min(H.R * 0.46, w * 0.8), eyes[0].h * 1.12);
    ctx.save(); ctx.clip(path);
    // bridge
    const [l, r] = eyes;
    if (l.visible && r.visible) {
      ctx.beginPath(); ctx.moveTo(l.x + w / 2 * l.fx * 0.9, l.y - h * 0.18); ctx.quadraticCurveTo((l.x + r.x) / 2, (l.y + r.y) / 2 - h * 0.42, r.x - w / 2 * r.fx * 0.9, r.y - h * 0.18);
      ctx.strokeStyle = '#111317'; ctx.lineWidth = H.R * 0.07; ctx.stroke();
    }
    // temples to the head edge
    for (const e of eyes) {
      if (!e.visible) continue;
      const ox = e.x + e.sd * w / 2 * e.fx;
      ctx.beginPath(); ctx.moveTo(ox, e.y - h * 0.2); ctx.lineTo(e.sd * H.rx * 1.05, e.y - h * 0.35);
      ctx.strokeStyle = '#111317'; ctx.lineWidth = H.R * 0.06; ctx.stroke();
    }
    for (const e of eyes) {
      if (!e.visible) continue;
      lens(ctx, e, w, h, h * 0.42); ctx.fillStyle = 'rgba(17,19,23,0.82)'; ctx.fill();
      ctx.lineWidth = H.R * 0.05; ctx.strokeStyle = '#0B0C0F'; ctx.stroke();
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.fx, e.fy);
      ctx.beginPath(); ctx.moveTo(-w * 0.28, -h * 0.05); ctx.lineTo(-w * 0.05, -h * 0.3);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = H.R * 0.05; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
};
OUTFITS.roundGlasses = {
  slot: 'face',
  front(ctx: Ctx, H: Head, path: Path2D) {
    const eyes = eyeFrames(H); const d = lensSpan(H, eyes, H.R * 0.56);
    ctx.save(); ctx.clip(path);
    const [l, r] = eyes;
    if (l.visible && r.visible) {
      ctx.beginPath(); ctx.moveTo(l.x + d / 2 * l.fx, l.y - d * 0.08); ctx.quadraticCurveTo((l.x + r.x) / 2, (l.y + r.y) / 2 - d * 0.3, r.x - d / 2 * r.fx, r.y - d * 0.08);
      ctx.strokeStyle = '#8A4B12'; ctx.lineWidth = H.R * 0.055; ctx.stroke();
    }
    for (const e of eyes) {
      if (!e.visible) continue;
      ctx.beginPath(); ctx.moveTo(e.x + e.sd * d / 2 * e.fx, e.y - d * 0.1); ctx.lineTo(e.sd * H.rx * 1.05, e.y - d * 0.25);
      ctx.strokeStyle = '#8A4B12'; ctx.lineWidth = H.R * 0.05; ctx.stroke();
    }
    for (const e of eyes) {
      if (!e.visible) continue;
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.fx, e.fy);
      ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(190,225,255,0.18)'; ctx.fill();
      ctx.lineWidth = H.R * 0.065; ctx.strokeStyle = '#9A5A1A'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, d / 2 - H.R * 0.03, Math.PI * 1.1, Math.PI * 1.45);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = H.R * 0.03; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
};

// --- Scarf: knitted band wrapped around the lower body, knot + hanging end.
// The band is cut from the body's own silhouette (grown ~6%), so it hugs every shape — round,
// boxy, triangular — and its thickness is constant in R, not stretched by tall/wide frames.
OUTFITS.scarf = {
  slot: 'neck',
  front(ctx: Ctx, H: Head, path: Path2D) {
    const s = 1.05, yc = -0.5, half = (0.15 * H.R) / H.ry;
    const y0 = yc + half, y1 = yc - half;
    const top = frontArc(H, y0, s), bot = frontArc(H, y1, s);
    const far = H.rx * 3;
    const band = new Path2D();
    band.moveTo(-far, top[0].y);
    top.forEach((q) => band.lineTo(q.x, q.y));
    band.lineTo(far, top[top.length - 1].y); band.lineTo(far, bot[bot.length - 1].y);
    for (let i = bot.length - 1; i >= 0; i--) band.lineTo(bot[i].x, bot[i].y);
    band.lineTo(-far, bot[0].y); band.closePath();
    const c = H.body ?? { x: 0, y: 0 };
    const grown = new Path2D();
    grown.addPath(path, new DOMMatrix().translate(c.x, c.y).scale(1.06, 1.04).translate(-c.x, -c.y));
    ctx.save(); ctx.clip(grown); ctx.clip(band);
    ctx.fillStyle = '#EF4444'; ctx.fill(band);
    // stripes along meridians
    for (const lon of [-1.0, -0.45, 0.1, 0.65, 1.2]) {
      const a = proj(H, surf(y0, lon, s)), b = proj(H, surf(y1, lon, s));
      if (a.z < 0.05) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - H.R * 0.1); ctx.lineTo(b.x, b.y + H.R * 0.1);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = H.R * 0.08 * Math.max(0.35, a.z); ctx.stroke();
    }
    ctx.restore();
    // hanging end from the knot
    const k = proj(H, surf(yc, -0.55, s * 1.03));
    if (k.z > 0) {
      const sw = H.phys.dx * H.rx * 0.12, L = H.R * 0.62;
      const end = new Path2D();
      end.moveTo(k.x - H.R * 0.15, k.y);
      end.quadraticCurveTo(k.x - H.R * 0.22 + sw, k.y + L * 0.55, k.x - H.R * 0.19 + sw * 1.4, k.y + L);
      end.lineTo(k.x + H.R * 0.07 + sw * 1.4, k.y + L * 0.97);
      end.quadraticCurveTo(k.x + H.R * 0.03 + sw, k.y + L * 0.5, k.x + H.R * 0.12, k.y);
      end.closePath();
      ctx.fillStyle = '#DC2626'; ctx.fill(end);
      ctx.save(); ctx.clip(end);
      ctx.fillStyle = '#FFFFFF';
      for (const t of [0.4, 0.72]) ctx.fillRect(k.x - H.R * 0.4 + sw, k.y + L * t, H.R * 0.8, H.R * 0.07);
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const fx = k.x - H.R * 0.16 + sw * 1.4 + i * H.R * 0.075;
        ctx.beginPath(); ctx.moveTo(fx, k.y + L * 0.97); ctx.lineTo(fx, k.y + L * 1.15);
        ctx.strokeStyle = '#DC2626'; ctx.lineWidth = H.R * 0.035; ctx.lineCap = 'round'; ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(k.x, k.y, H.R * 0.16, H.R * 0.14, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#E23B3B'; ctx.fill();
    }
  }
};

// --- Pumpkin: body recolour + soft ribs following meridians + a chunky rounded stem & leaf
OUTFITS.pumpkin = {
  slot: 'body',
  bodyColors: ['#FFA94D', '#E8590C'],
  under(ctx: Ctx, H: Head, path: Path2D) {
    ctx.save(); ctx.clip(path);
    for (const lon of [-1.15, -0.55, 0.0, 0.55, 1.15]) {
      const pts: Q[] = [];
      for (let i = 0; i <= 30; i++) { const y = -0.98 + 1.96 * i / 30; const q = proj(H, surf(y, lon, 1)); if (q.z > 0) pts.push(q); }
      if (pts.length < 2) continue;
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
      const zz = pts[Math.floor(pts.length / 2)].z;
      ctx.strokeStyle = `rgba(150,50,0,${0.22 * zz})`; ctx.lineWidth = H.R * 0.12; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  },
  front(ctx: Ctx, H: Head) {
    // Stem: same language as the character — fat, round-capped, one flat colour.
    const t = proj(H, [0, 0.97, 0]);
    const sway = H.phys.dx * H.R * 0.06;
    const tipX = t.x + H.R * 0.07 + sway, tipY = t.y - H.R * 0.26;
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(t.x, t.y + H.R * 0.04);
    ctx.quadraticCurveTo(t.x - H.R * 0.01, t.y - H.R * 0.16, tipX, tipY);
    ctx.strokeStyle = '#5B8A32'; ctx.lineWidth = H.R * 0.17; ctx.stroke();
    // Leaf: a single soft rounded leaf, flat
    ctx.translate(t.x - H.R * 0.04, t.y - H.R * 0.04); ctx.rotate(-0.35 - sway / H.R);
    const L = H.R * 0.36, W = H.R * 0.17;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-L * 0.3, -W * 1.05, -L * 0.85, -W * 0.9, -L, 0);
    ctx.bezierCurveTo(-L * 0.85, W * 0.7, -L * 0.3, W * 0.8, 0, 0); ctx.closePath();
    ctx.fillStyle = '#7CB342'; ctx.fill();
    ctx.restore();
  }
};

// ═══════════════════════ SKINS (body slot) ═══════════════════════
// A skin recolours the body (bodyColors[1]) and draws its pattern in the `under` pass — on the
// body but beneath cheeks and eyes — so the face always stays readable. Ears and bumps go in
// `back` (behind the body) and are placed on the head frame (`H.crown`) so they sit right on
// every shape, from the wide Soft to the narrow-topped Onigiri.

/** A point on the body surface, with how much it faces the viewer (0..1). */
function onBody(H: Head, y: number, lon: number, s = 1.0): Q & { f: number } {
  const q = proj(H, surf(y, lon, s));
  return { ...q, f: Math.max(0, q.z) };
}
function nearEyes(H: Head, q: { x: number; y: number }, pad: number): boolean {
  return (H.eyes ?? []).some((e) => e.visible && Math.hypot(q.x - e.x, (q.y - e.y) * 0.8) < pad);
}
/** Two ears/bumps on top of the head, turning with it. `inner` draws an inner colour. */
function headBumps(ctx: Ctx, H: Head, o: { spread: number; lift: number; r: number; color: string; inner?: string; innerR?: number }) {
  const c = H.crown ?? { x: 0, y: 0, rx: H.rx, ry: H.ry };
  const k = Math.min(c.rx, c.ry);
  for (const sd of [-1, 1]) {
    const lon = sd * o.spread + H.yaw;
    if (Math.cos(lon) < -0.2) continue;
    const x = c.x + Math.sin(lon) * c.rx * 0.82;
    const y = c.y - c.ry * o.lift + Math.abs(Math.sin(lon)) * c.ry * 0.1;
    const r = k * o.r;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = o.color; ctx.fill();
    if (o.inner) {
      ctx.beginPath(); ctx.arc(x, y + r * 0.08, r * (o.innerR ?? 0.55), 0, Math.PI * 2); ctx.fillStyle = o.inner; ctx.fill();
    }
  }
}
/** Region of the body below a horizontal ring (for rinds, bellies…). */
function belowRing(H: Head, y: number): Path2D {
  const arc = frontArc(H, y, 1.15);
  const p = new Path2D(), far = H.rx * 3;
  p.moveTo(arc[0].x - far, arc[0].y); arc.forEach((q) => p.lineTo(q.x, q.y));
  p.lineTo(arc[arc.length - 1].x + far, arc[arc.length - 1].y);
  p.lineTo(far * 2, H.ry * 4); p.lineTo(-far * 2, H.ry * 4); p.closePath();
  return p;
}
function seed(ctx: Ctx, q: Q & { f: number }, len: number, color: string, tilt = 0) {
  if (q.f < 0.08) return;
  ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(tilt); ctx.scale(Math.max(0.35, q.f), 1);
  ctx.beginPath(); ctx.ellipse(0, 0, len * 0.42, len * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}

// --- Strawberry: red body, little yellow seeds, a leafy crown on top
OUTFITS.strawberry = {
  slot: 'body',
  bodyColors: ['#F04E6A', '#EE4D68'],
  under(ctx: Ctx, H: Head, path: Path2D) {
    ctx.save(); ctx.clip(path);
    // seeds cover the whole berry, evenly; the eyes are drawn on top, so nothing is
    // cut out around them (cut-outs made bald patches that followed the gaze)
    // The face area is fixed on the berry (it turns with the head, like the eyes), so it
    // gets only a few, smaller seeds; the rest of the berry stays fully seeded.
    let row = 0;
    for (let y = 0.84; y > -0.97; y -= 0.24, row++) {
      let col = 0;
      for (let lon = -2.7 + (row % 2) * 0.25; lon <= 2.7; lon += 0.5, col++) {
        const face = Math.abs(lon) < 0.85 && y < 0.5 && y > -0.42;
        if (face && (row + col) % 3 !== 0) continue;
        seed(ctx, onBody(H, y, lon), H.R * (face ? 0.045 : 0.062), '#FFE58A', lon * 0.15);
      }
    }
    ctx.restore();
  },
  front(ctx: Ctx, H: Head) {
    const t = proj(H, [0, 0.97, 0]);
    const sway = H.phys.dx * 0.15;
    ctx.save(); ctx.translate(t.x, t.y + H.R * 0.04);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.5 + sway;
      ctx.save(); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-H.R * 0.11, -H.R * 0.14, 0, -H.R * 0.3);
      ctx.quadraticCurveTo(H.R * 0.11, -H.R * 0.14, 0, 0);
      ctx.fillStyle = '#4FA845'; ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(0, -H.R * 0.02); ctx.quadraticCurveTo(H.R * 0.03, -H.R * 0.16, H.R * 0.09, -H.R * 0.22);
    ctx.strokeStyle = '#3E8A37'; ctx.lineWidth = H.R * 0.07; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
  },
};

// --- Watermelon: pink flesh, dark seeds, green rind along the bottom
OUTFITS.watermelon = {
  slot: 'body',
  bodyColors: ['#FF6B7A', '#FF6B7A'],
  under(ctx: Ctx, H: Head, path: Path2D) {
    ctx.save(); ctx.clip(path);
    ctx.fillStyle = '#D9F2C2'; ctx.fill(belowRing(H, -0.5));
    ctx.fillStyle = '#3F9E4F'; ctx.fill(belowRing(H, -0.64));
    const seeds: [number, number][] = [[0.6, -0.9], [0.55, 0.85], [0.25, -1.3], [0.2, 1.25], [-0.22, -1.0], [-0.25, 1.0], [0.82, 0.1], [-0.3, 0]];
    for (const [y, lon] of seeds) {
      seed(ctx, onBody(H, y, lon), H.R * 0.1, '#2A1F22', lon * 0.25);
    }
    ctx.restore();
  },
};

// --- Panda: white body, black ears and eye patches (eyes turn white inside them)
OUTFITS.panda = {
  slot: 'body',
  bodyColors: ['#F3F3EF', '#F3F3EF'],
  eyeInk: '#FFFFFF',
  back(ctx: Ctx, H: Head) {
    headBumps(ctx, H, { spread: 0.72, lift: 0.98, r: 0.3, color: '#25272D' });
  },
  under(ctx: Ctx, H: Head, path: Path2D) {
    ctx.save(); ctx.clip(path);
    for (const e of H.eyes ?? []) {
      if (!e.visible) continue;
      const rx = Math.max(e.w * 1.9, H.R * 0.26) * e.fx;
      const ry = Math.max(e.h * 0.95, H.R * 0.3) * e.fy;
      ctx.beginPath(); ctx.ellipse(e.x + e.sd * H.R * 0.02, e.y + H.R * 0.05, rx, ry, e.sd * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#25272D'; ctx.fill();
    }
    ctx.restore();
  },
};

// --- Tiger: orange with dark stripes, cream muzzle, round ears
OUTFITS.tiger = {
  slot: 'body',
  bodyColors: ['#F28A2E', '#F28A2E'],
  back(ctx: Ctx, H: Head) {
    headBumps(ctx, H, { spread: 0.8, lift: 0.8, r: 0.24, color: '#F28A2E', inner: '#3A2618', innerR: 0.5 });
  },
  under(ctx: Ctx, H: Head, path: Path2D) {
    ctx.save(); ctx.clip(path);
    const m = onBody(H, -0.42, 0);
    if (m.f > 0.2) {
      ctx.beginPath(); ctx.ellipse(m.x, m.y, H.R * 0.42 * Math.max(0.4, m.f), H.R * 0.26, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF1DE'; ctx.fill();
    }
    ctx.lineCap = 'round'; ctx.strokeStyle = '#3A2618';
    const stripe = (pts: [number, number][], w: number) => {
      const q = pts.map(([y, lon]) => onBody(H, y, lon));
      if (q.every((p) => p.f < 0.1) || q.some((p) => nearEyes(H, p, H.R * 0.3))) return;
      ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.lineWidth = w; ctx.stroke();
    };
    for (const sd of [-1, 1]) {
      stripe([[0.45, sd * 1.55], [0.3, sd * 1.15], [0.2, sd * 0.95]], H.R * 0.08);
      stripe([[0.05, sd * 1.6], [-0.05, sd * 1.25], [-0.12, sd * 1.05]], H.R * 0.08);
      stripe([[-0.35, sd * 1.6], [-0.42, sd * 1.3]], H.R * 0.07);
    }
    for (const lon of [-0.28, 0, 0.28]) stripe([[0.98, lon], [0.8, lon * 0.9]], H.R * 0.075);
    ctx.restore();
  },
};

// --- Cow: cream with dark patches and a pink snout
OUTFITS.cow = {
  slot: 'body',
  bodyColors: ['#F6F3EC', '#F6F3EC'],
  back(ctx: Ctx, H: Head) {
    headBumps(ctx, H, { spread: 1.05, lift: 0.6, r: 0.2, color: '#F6F3EC', inner: '#F2A7B5', innerR: 0.55 });
  },
  under(ctx: Ctx, H: Head, path: Path2D) {
    ctx.save(); ctx.clip(path);
    const spots: [number, number, number][] = [[0.55, -1.0, 0.3], [0.15, 1.15, 0.32], [-0.6, -0.75, 0.24], [0.88, 0.55, 0.22], [-0.45, 1.5, 0.2]];
    for (const [y, lon, r] of spots) {
      const q = onBody(H, y, lon);
      if (q.f < 0.06 || nearEyes(H, q, H.R * (0.3 + r))) continue;
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(Math.max(0.4, q.f), 1); ctx.fillStyle = '#2E2A28';
      const R0 = H.R * r;
      ctx.beginPath(); ctx.arc(0, 0, R0, 0, Math.PI * 2); ctx.arc(R0 * 0.6, -R0 * 0.35, R0 * 0.62, 0, Math.PI * 2); ctx.arc(-R0 * 0.55, R0 * 0.4, R0 * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const s = onBody(H, -0.5, 0);
    if (s.f > 0.2) {
      const w = H.R * 0.4 * Math.max(0.45, s.f), h = H.R * 0.22;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, w, h, 0, 0, Math.PI * 2); ctx.fillStyle = '#F2A7B5'; ctx.fill();
      ctx.fillStyle = '#C46F84';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s.x + sd * w * 0.38, s.y, w * 0.11, h * 0.26, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  },
};

// --- Frog: green with eye bumps on top and a pale belly
OUTFITS.frog = {
  slot: 'body',
  bodyColors: ['#74BF57', '#74BF57'],
  back(ctx: Ctx, H: Head) {
    headBumps(ctx, H, { spread: 0.5, lift: 0.98, r: 0.36, color: '#74BF57' });
  },
  under(ctx: Ctx, H: Head, path: Path2D) {
    ctx.save(); ctx.clip(path);
    const b = onBody(H, -0.62, 0);
    if (b.f > 0.15) {
      ctx.beginPath(); ctx.ellipse(b.x, b.y + H.R * 0.12, H.R * 0.72 * Math.max(0.5, b.f), H.R * 0.48, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#CDEBAE'; ctx.fill();
    }
    ctx.restore();
  },
};

// --- Snowman (December): snow-white, carrot nose, coal buttons
OUTFITS.snowman = {
  slot: 'body',
  bodyColors: ['#F4F7FB', '#F4F7FB'],
  under(ctx: Ctx, H: Head, path: Path2D) {
    ctx.save(); ctx.clip(path);
    for (const y of [-0.3, -0.53, -0.76]) {
      const q = onBody(H, y, 0);
      if (q.f < 0.2) continue;
      ctx.beginPath(); ctx.arc(q.x, q.y, H.R * 0.075, 0, Math.PI * 2); ctx.fillStyle = '#2F3237'; ctx.fill();
    }
    // a light dusting of snow-blue speckles on the sides
    for (const [y, lon] of [[0.6, -1.1], [0.2, 1.3], [-0.2, -1.4], [0.75, 0.9], [-0.5, 1.2]] as [number, number][]) {
      const q = onBody(H, y, lon);
      if (q.f < 0.1) continue;
      ctx.beginPath(); ctx.arc(q.x, q.y, H.R * 0.045, 0, Math.PI * 2); ctx.fillStyle = '#D6E3F2'; ctx.fill();
    }
    ctx.restore();
  },
  front(ctx: Ctx, H: Head) {
    const eyes = (H.eyes ?? []).filter((e) => e.visible);
    if (eyes.length < 2) return;
    const x = (eyes[0].x + eyes[1].x) / 2, y = Math.max(eyes[0].y, eyes[1].y) + Math.max(eyes[0].h, eyes[1].h) * 0.35 + H.R * 0.06;
    const dir = Math.sin(H.yaw) >= 0 ? 1 : -1;
    const len = H.R * (0.26 + 0.16 * Math.abs(Math.sin(H.yaw)));
    ctx.beginPath(); ctx.moveTo(x - dir * H.R * 0.02, y - H.R * 0.07); ctx.lineTo(x + dir * len, y + H.R * 0.02); ctx.lineTo(x - dir * H.R * 0.02, y + H.R * 0.07); ctx.closePath();
    ctx.fillStyle = '#F28C38'; ctx.lineJoin = 'round'; ctx.fill();
  },
};

// --- Bow (kept, now anchored in 3D so it turns with the head)
OUTFITS.bow = {
  slot: 'head',
  front(ctx: Ctx, H: Head) {
    const a = proj(H, surf(0.86, 0.55, 1.02));
    if (a.z < -0.2) return;
    const s = H.R * 0.26, sq = Math.max(0.45, Math.cos(0.55 + H.yaw));
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(0.35 + H.yaw * 0.3); ctx.scale(sq, 1);
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(sd * s * 0.6, -s * 0.85, sd * s * 1.35, -s * 0.55, sd * s * 1.15, 0);
      ctx.bezierCurveTo(sd * s * 1.35, s * 0.55, sd * s * 0.6, s * 0.85, 0, 0);
      ctx.fillStyle = lin(ctx, 0, -s, 0, s, [[0, '#FF8CC6'], [1, '#DB2777']]); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sd * s * 0.25, -s * 0.05); ctx.quadraticCurveTo(sd * s * 0.7, -s * 0.15, sd * s * 0.95, -s * 0.05);
      ctx.strokeStyle = 'rgba(140,10,70,0.35)'; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.24, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, -s * 0.06, -s * 0.1, 0, s * 0.35, [[0, '#FFB3D9'], [1, '#C2185B']]); ctx.fill();
    ctx.restore();
  }
};


// ═══════════════════════ NEW ACCESSORIES (designed for Dossier) ═══════════════════════
const clock = () => performance.now() / 1000;

// --- Halo: floating gold ring; back half drawn darker so it reads as a 3D ring
function haloSegments(ctx: Ctx, H: Head, side: number) {
  const y = 1.27 + H.phys.dy * 0.1 + Math.sin(clock() * 1.7) * 0.035;
  const r = 0.6, N = 64;
  const pts: Q[] = [];
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2; pts.push(proj(H, [r * Math.sin(a), y, r * Math.cos(a)])); }
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[i + 1], z = (a.z + b.z) / 2;
    if ((side > 0) !== (z >= 0)) continue;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = z >= 0 ? '#FCD34D' : '#B7791F'; ctx.lineWidth = H.R * 0.11;
    ctx.stroke();
    if (side > 0) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y - H.R * 0.018); ctx.lineTo(b.x, b.y - H.R * 0.018);
      ctx.strokeStyle = 'rgba(255,250,220,0.85)'; ctx.lineWidth = H.R * 0.03; ctx.stroke();
    }
  }
  ctx.restore();
}
OUTFITS.halo = {
  slot: 'head',
  fit: 'crown',
  back(ctx: Ctx, H: Head) { haloSegments(ctx, H, -1); },
  front(ctx: Ctx, H: Head) { haloSegments(ctx, H, 1); },
};

// --- Sprout: two-leaf seedling growing from the crown, sways with the head
OUTFITS.sprout = {
  slot: 'head',
  front(ctx: Ctx, H: Head) {
    const base = proj(H, [0, 0.98, 0]);
    const sway = H.phys.dx * 0.5 + Math.sin(clock() * 1.6) * 0.08;
    const tip = { x: base.x + sway * H.R * 0.35, y: base.y - H.R * 0.42 };
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(base.x, base.y + H.R * 0.04);
    ctx.quadraticCurveTo(base.x - sway * H.R * 0.1, base.y - H.R * 0.24, tip.x, tip.y);
    ctx.strokeStyle = '#4D7C0F'; ctx.lineWidth = H.R * 0.065; ctx.stroke();
    for (const [rotA, len] of [[-0.95, 0.34], [0.75, 0.28]] as [number, number][]) {
      ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(rotA + sway * 0.6);
      const L = H.R * len, W = H.R * len * 0.48;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(L * 0.45, -W, L, 0); ctx.quadraticCurveTo(L * 0.45, W * 0.75, 0, 0); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -W, L, W, [[0, '#A3E635'], [1, '#4D7C0F']]); ctx.fill();
      ctx.beginPath(); ctx.moveTo(L * 0.08, 0); ctx.quadraticCurveTo(L * 0.5, -W * 0.18, L * 0.9, 0);
      ctx.strokeStyle = 'rgba(30,70,0,0.45)'; ctx.lineWidth = H.R * 0.018; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
};

// --- Headphones: arched band over the head, cushioned cups on both sides.
// Each cup (and each band segment) is drawn in the back pass when it turns away from the
// viewer, so at extreme gaze the far cup goes BEHIND the head instead of over the eyes.
function headphoneCup(ctx: Ctx, H: Head, sd: number) {
  const c = proj(H, [sd * 1.04, 0.2, 0]);
  const face = Math.max(0.55, Math.abs(Math.cos(H.yaw * 0.8)));
  ctx.save(); ctx.translate(c.x, c.y); ctx.scale(face, 1);
  roundRect(ctx, -H.R * 0.15, -H.R * 0.26, H.R * 0.3, H.R * 0.52, H.R * 0.14);
  ctx.fillStyle = '#262A31'; ctx.fill();
  roundRect(ctx, -H.R * 0.09, -H.R * 0.18, H.R * 0.18, H.R * 0.36, H.R * 0.09);
  ctx.fillStyle = '#2DD4BF'; ctx.fill();
  ctx.restore();
}
function headphones(ctx: Ctx, H: Head, side: number) {
  const arc: Q[] = [];
  for (let i = 0; i <= 48; i++) { const th = Math.PI * (1 - i / 48); arc.push(proj(H, [Math.cos(th) * 1.08, 0.2 + Math.sin(th) * 0.95, 0])); }
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#262A31'; ctx.lineWidth = H.R * 0.12;
  for (let i = 0; i < arc.length - 1; i++) {
    const a = arc[i], b = arc[i + 1];
    if (((a.z + b.z) / 2 >= 0) !== (side > 0)) continue;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const sd of [-1, 1]) {
    const z = proj(H, [sd * 1.04, 0.2, 0]).z;
    if ((z >= 0) === (side > 0)) headphoneCup(ctx, H, sd);
  }
  ctx.restore();
}
OUTFITS.headphones = {
  slot: 'head',
  back(ctx: Ctx, H: Head) { headphones(ctx, H, -1); },
  front(ctx: Ctx, H: Head) { headphones(ctx, H, 1); },
};

// --- Graduation cap: skull cap + mortarboard in perspective + swinging tassel
const GRAD = { s: 1.03, yCap: 0.62, board: 1.06 };
OUTFITS.gradCap = {
  slot: 'head',
  fit: 'crown',
  brimY: (H) => ringLow(H, GRAD.yCap, GRAD.s),
  front(ctx: Ctx, H: Head) {
    const { s, yCap } = GRAD;
    const head = mochiPath(H.rx * s, H.ry * s);
    ctx.save(); ctx.clip(capClip(H, yCap, s)); ctx.clip(head);
    ctx.fillStyle = '#1E293B'; ctx.fill(head);
    ctx.restore();
    const y = GRAD.board, b = 1.0;
    const corners = [[b, 0], [0, b], [-b, 0], [0, -b]].map(([x, z]) => proj(H, [x * 0.95, y, z * 0.95]));
    const thick = H.R * 0.07;
    const poly = (dy: number) => { const p = new Path2D(); corners.forEach((c, i) => i ? p.lineTo(c.x, c.y + dy) : p.moveTo(c.x, c.y + dy)); p.closePath(); return p; };
    ctx.fillStyle = '#0B1220'; ctx.fill(poly(thick));
    ctx.fillStyle = '#273449'; ctx.fill(poly(0));
    const btn = proj(H, [0, y, 0]);
    const k = corners[1];
    const sw = H.phys.dx * H.R * 0.25 + Math.sin(clock() * 2.2) * H.R * 0.03;
    ctx.beginPath(); ctx.moveTo(btn.x, btn.y); ctx.lineTo(k.x, k.y); ctx.quadraticCurveTo(k.x + sw * 0.4, k.y + H.R * 0.25, k.x + sw, k.y + H.R * 0.48);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = H.R * 0.035; ctx.lineCap = 'round'; ctx.stroke();
    ctx.save(); ctx.translate(k.x + sw, k.y + H.R * 0.5);
    roundRect(ctx, -H.R * 0.05, 0, H.R * 0.1, H.R * 0.16, H.R * 0.03);
    ctx.fillStyle = '#F5B82E'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(btn.x, btn.y, H.R * 0.05, 0, Math.PI * 2); ctx.fillStyle = '#FBBF24'; ctx.fill();
  },
};

// --- Bowtie: sits at the front of the neck, turns with the head
OUTFITS.bowtie = {
  slot: 'neck',
  front(ctx: Ctx, H: Head) {
    const k = proj(H, surf(-0.74, 0, 1.03));
    if (k.z < 0) return;
    const s = H.R * 0.24, sq = Math.max(0.4, Math.cos(H.yaw));
    ctx.save(); ctx.translate(k.x, k.y); ctx.scale(sq, 1);
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(sd * s * 0.7, -s * 0.75, sd * s * 1.25, -s * 0.5);
      ctx.quadraticCurveTo(sd * s * 1.45, 0, sd * s * 1.25, s * 0.5);
      ctx.quadraticCurveTo(sd * s * 0.7, s * 0.75, 0, 0); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -s, 0, s, [[0, '#E11D48'], [1, '#881337']]); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sd * s * 0.3, -s * 0.18); ctx.quadraticCurveTo(sd * s * 0.75, -s * 0.3, sd * s * 1.05, -s * 0.28);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round'; ctx.stroke();
    }
    roundRect(ctx, -s * 0.24, -s * 0.3, s * 0.48, s * 0.6, s * 0.16);
    ctx.fillStyle = lin(ctx, 0, -s * 0.3, 0, s * 0.3, [[0, '#BE123C'], [1, '#700A2C']]); ctx.fill();
    ctx.restore();
  },
};

// --- Flower: daisy tucked on the side of the head (mirror of the bow)
OUTFITS.flower = {
  slot: 'head',
  front(ctx: Ctx, H: Head) {
    const a = proj(H, surf(0.8, -0.6, 1.03));
    if (a.z < -0.2) return;
    const s = H.R * 0.22, sq = Math.max(0.45, Math.cos(-0.6 + H.yaw));
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(-0.25 + H.yaw * 0.3); ctx.scale(sq, 1);
    for (let i = 0; i < 9; i++) {
      ctx.save(); ctx.rotate((i / 9) * Math.PI * 2);
      ctx.beginPath(); ctx.ellipse(0, -s * 0.62, s * 0.24, s * 0.46, 0, 0, Math.PI * 2);
      ctx.fillStyle = rad(ctx, 0, -s * 0.8, 0, s * 0.6, [[0, '#FFFFFF'], [1, '#E5E7EB']]); ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, -s * 0.1, -s * 0.12, 0, s * 0.4, [[0, '#FDE68A'], [1, '#F59E0B']]); ctx.fill();
    ctx.fillStyle = 'rgba(180,83,9,0.45)';
    for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(t) * s * 0.17, Math.sin(t) * s * 0.17, s * 0.04, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  },
};

export const ACCESSORY_RENDERERS: Readonly<Record<string, OutfitDef>> = OUTFITS;
export { mochiPath as superellipsePath };
