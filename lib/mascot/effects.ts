/**
 * Particles. Positions are in "body units" (1 = R × 1.3) relative to the body centre,
 * so effects scale with the avatar. Legacy types (heart/star/spark/sweat/z) behave
 * exactly like Coucou's; steam/confetti/chunk/ring/streak are new (explosion + celebrations).
 */
import { Ease, FONT, clamp, heartPath, lerp, starPath } from "./core";

export type ParticleType = "heart" | "star" | "spark" | "sweat" | "z" | "steam" | "confetti" | "chunk" | "ring" | "streak"
  | "puff" | "goo" | "dash" | "shock" | "eyebit" | "dot";

export interface Particle {
  type: ParticleType;
  x: number; y: number; vx: number; vy: number;
  /** Gravity (units/s²). 0 = legacy linear drift. */
  g: number;
  age: number; life: number;
  rot: number; vr: number; size: number;
  color: string;
  color2?: string;
}

export const CONFETTI_COLORS = ["#F87171", "#FBBF24", "#34D399", "#60A5FA", "#A78BFA", "#F472B6", "#FFFFFF"];
const STREAK_COLORS = ["#3B9EFF", "#F29B38", "#FF5A4E", "#2EC4A0", "#A78BFA"];

/** Flat-style particles animate by scale, never by opacity. */
const FLAT_TYPES = new Set<ParticleType>(["puff", "goo", "dash", "shock", "eyebit", "dot"]);

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Legacy floating emitters (hearts, stars, sparks, sweat, z). */
export function emitFloat(list: Particle[], type: "heart" | "star" | "spark" | "sweat" | "z", count: number) {
  for (let i = 0; i < count; i++) {
    const isZ = type === "z";
    list.push({
      type, g: 0,
      x: (Math.random() - 0.5) * 0.9 + (isZ ? 0.55 : 0), y: -0.7 - Math.random() * 0.2,
      vx: (Math.random() - 0.5) * 0.35 + (isZ ? 0.18 : 0), vy: -(0.45 + Math.random() * 0.35),
      age: -i * 0.14, life: 1.3 + Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2, vr: 0, size: 0.15 + Math.random() * 0.08, color: "",
    });
  }
}

export function emitSteam(list: Particle[], side: number) {
  list.push({
    type: "steam", g: -0.2, x: side * rnd(0.45, 0.6), y: -0.62, vx: side * rnd(0.08, 0.2), vy: -rnd(0.35, 0.55),
    age: 0, life: rnd(0.8, 1.1), rot: 0, vr: 0, size: rnd(0.09, 0.13), color: "",
  });
}

/** Explosion / celebration burst. `strength` 0.4 = small celebration, 1 = full boom. */
export function emitBurst(list: Particle[], strength: number, bodyColors: [string, string], withChunks: boolean) {
  const n = Math.round(70 * strength);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rnd(0.9, 2.3) * (0.6 + strength * 0.4);
    list.push({
      type: "confetti", g: 2.1, x: 0, y: -0.1,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0.6, 1.3),
      age: -Math.random() * 0.06, life: rnd(1.5, 2.4), rot: Math.random() * Math.PI * 2, vr: rnd(-10, 10),
      size: rnd(0.06, 0.11), color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    });
  }
  const rings = strength >= 0.8 ? 3 : 1;
  for (let i = 0; i < rings; i++) {
    list.push({ type: "ring", g: 0, x: 0, y: 0, vx: 0, vy: 0, age: -i * 0.08, life: 1.1, rot: 0, vr: 0, size: 1 + i * 0.25, color: "#FFFFFF" });
  }
  const streaks = Math.round(16 * strength);
  for (let i = 0; i < streaks; i++) {
    list.push({
      type: "streak", g: 0, x: 0, y: 0, vx: (i / streaks) * Math.PI * 2 + rnd(-0.15, 0.15), vy: rnd(1.6, 2.6),
      age: -rnd(0, 0.08), life: 0.6, rot: 0, vr: 0, size: rnd(0.12, 0.22), color: STREAK_COLORS[i % STREAK_COLORS.length],
    });
  }
  if (withChunks) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rnd(-0.3, 0.3);
      const sp = rnd(1.2, 2.1);
      list.push({
        type: "chunk", g: 3.2, x: Math.cos(a) * 0.2, y: Math.sin(a) * 0.15,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.1, age: 0, life: rnd(1.0, 1.5),
        rot: 0, vr: rnd(-6, 6), size: rnd(0.14, 0.24), color: bodyColors[0], color2: bodyColors[1],
      });
    }
  }
}

// ── flat-style annoyance effects ─────────────────────────────────────────────

/** SET ASIDE (removed from burst at launch). Flat smoke: a little 3-ball cloud that grows in, drifts up and out, and shrinks away (no fading). */
export function emitPuff(list: Particle[], side: number, big = false) {
  list.push({
    type: "puff", g: -0.15, x: side * rnd(0.42, 0.58), y: -0.6, vx: side * rnd(0.12, 0.24), vy: -rnd(0.4, 0.6),
    age: 0, life: rnd(0.9, 1.2), rot: rnd(0, Math.PI * 2), vr: side * rnd(0.4, 1), size: (big ? 1.25 : 1) * rnd(0.1, 0.13), color: "#E3E6ED",
  });
}

/**
 * The burst, flat: a white shock ring, comic "pop" dashes, the body splitting into soft goo
 * blobs of its own colour, a few dots, and the two eyes popping out and tumbling. Everything
 * shrinks away instead of fading — no confetti, no gradients.
 */
export function emitPop(list: Particle[], body: string, ink: string) {
  list.push({ type: "shock", g: 0, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0.45, rot: 0, vr: 0, size: 1.5, color: "#FFFFFF" });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rnd(-0.12, 0.12);
    list.push({ type: "dash", g: 0, x: 0, y: 0, vx: a, vy: rnd(1.05, 1.35), age: -rnd(0, 0.04), life: 0.38, rot: 0, vr: 0, size: rnd(0.22, 0.32), color: i % 2 ? "#FFFFFF" : body });
  }
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rnd(-0.25, 0.25);
    const sp = rnd(1.3, 2.5);
    list.push({
      type: "goo", g: 3.6, x: Math.cos(a) * 0.15, y: Math.sin(a) * 0.12,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0.9, 1.5), age: 0, life: rnd(0.95, 1.35),
      rot: 0, vr: 0, size: i < 4 ? rnd(0.2, 0.28) : rnd(0.09, 0.17), color: body,
    });
  }
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, sp = rnd(1.6, 3);
    list.push({ type: "dot", g: 2.6, x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.8, age: -rnd(0, 0.05), life: rnd(0.6, 0.9), rot: 0, vr: 0, size: rnd(0.035, 0.06), color: i % 3 ? body : "#FFFFFF" });
  }
  for (const sd of [-1, 1]) {
    list.push({ type: "eyebit", g: 4.2, x: sd * 0.16, y: -0.05, vx: sd * rnd(0.5, 0.9), vy: -rnd(2.1, 2.6), age: 0, life: 1.25, rot: 0, vr: sd * rnd(6, 9), size: 0.16, color: ink });
  }
}

export function stepParticles(list: Particle[], dt: number): Particle[] {
  for (const p of list) {
    p.age += dt;
    if (p.age <= 0) continue;
    if (p.g !== 0 || p.type === "confetti" || p.type === "chunk" || p.type === "steam" || p.type === "puff") {
      p.vy += p.g * dt;
      if (p.type === "confetti") { p.vx *= Math.pow(0.35, dt); p.vy = Math.min(p.vy, 1.1); }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }
  return list.filter((p) => p.age < p.life);
}

export function drawParticles(x: CanvasRenderingContext2D, list: Particle[], R: number, cx: number, cy: number) {
  const U = R * 1.3;
  for (const p of list) {
    if (p.age <= 0) continue;
    const k = p.age / p.life;
    const legacy = p.g === 0 && (p.type === "heart" || p.type === "star" || p.type === "spark" || p.type === "sweat" || p.type === "z");
    const px = cx + (legacy ? p.x + p.vx * p.age : p.x) * U;
    const py = cy + (legacy ? p.y + p.vy * p.age : p.y) * U;
    const fade = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
    const sz = R * p.size * (1 + k * 0.4);
    x.save();
    x.translate(px, py);
    x.globalAlpha = FLAT_TYPES.has(p.type) ? 1 : clamp(fade, 0, 1);
    switch (p.type) {
      case "heart": x.rotate(Math.sin(p.age * 6) * 0.3); x.fillStyle = "#FF4D6D"; heartPath(x, sz); x.fill(); break;
      case "star": x.rotate(p.rot + p.age * 2); x.fillStyle = "#F7B32B"; starPath(x, sz, sz * 0.45); x.fill(); break;
      case "spark": x.rotate(p.rot); x.fillStyle = "#fff"; starPath(x, sz * 0.8, sz * 0.18); x.fill(); break;
      case "sweat":
        x.fillStyle = "#7CC7FF"; x.beginPath(); x.moveTo(0, -sz);
        x.quadraticCurveTo(sz * 0.8, sz * 0.2, 0, sz * 0.6); x.quadraticCurveTo(-sz * 0.8, sz * 0.2, 0, -sz); x.fill(); break;
      case "z":
        x.fillStyle = "rgb(209,219,235)"; x.font = `700 ${sz * 1.9}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText("z", 0, 0); break;
      case "steam": {
        const r = R * lerp(p.size, p.size * 2.4, Ease.out(k));
        x.globalAlpha = clamp((1 - k) * 0.75, 0, 1);
        x.fillStyle = "rgba(236,238,242,1)";
        x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.arc(r * 0.7, -r * 0.3, r * 0.7, 0, Math.PI * 2); x.fill();
        break;
      }
      case "confetti": {
        x.globalAlpha = clamp(1 - Math.max(0, k - 0.7) / 0.3, 0, 1);
        x.rotate(p.rot);
        x.scale(1, Math.cos(p.age * 9 + p.vr));
        x.fillStyle = p.color;
        const s = R * p.size;
        x.fillRect(-s / 2, -s * 0.3, s, s * 0.6);
        break;
      }
      case "chunk": {
        x.globalAlpha = clamp(1 - Math.max(0, k - 0.6) / 0.4, 0, 1);
        const s = R * p.size * (1 - k * 0.3);
        x.rotate(p.rot);
        x.fillStyle = p.color; x.beginPath(); x.ellipse(0, 0, s, s * 0.8, 0, 0, Math.PI * 2); x.fill();
        break;
      }
      case "ring": {
        const e = Ease.out(k);
        const rx = R * lerp(0.4, 2.8 * p.size, e);
        const ry = rx * 0.55;
        x.globalAlpha = clamp((1 - k) * 0.9, 0, 1);
        x.fillStyle = "#fff";
        const N = 72;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2 + p.size;
          x.fillRect(Math.cos(a) * rx, Math.sin(a) * ry, Math.max(1, R * 0.025), Math.max(1, R * 0.025));
        }
        break;
      }
      case "puff": {
        // grow in fast, hold, shrink out — flat, opaque
        const s = R * p.size * (k < 0.18 ? Ease.back(k / 0.18) : k > 0.62 ? 1 - Ease.inOut((k - 0.62) / 0.38) : 1) * (1 + k * 0.7);
        if (s <= 0.2) break;
        x.rotate(p.rot + p.vr * p.age);
        x.fillStyle = p.color;
        x.beginPath();
        x.arc(-s * 0.55, s * 0.12, s * 0.62, 0, Math.PI * 2);
        x.arc(s * 0.5, s * 0.15, s * 0.55, 0, Math.PI * 2);
        x.arc(0, -s * 0.22, s * 0.78, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case "shock": {
        const e = Ease.out(k);
        const r = R * lerp(0.7, p.size * 1.25, e);
        const w = R * 0.16 * (1 - e);
        if (w < 0.3) break;
        x.strokeStyle = p.color; x.lineWidth = w;
        x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke();
        break;
      }
      case "dash": {
        // comic pop line: shoots out, then retracts from the inside
        const e = Ease.out(k);
        const outer = R * p.vy * (0.75 + 0.45 * e);
        const inner = R * p.vy * (0.55 + 0.6 * Ease.inOut(k));
        if (outer - inner < 0.5) break;
        x.strokeStyle = p.color; x.lineCap = "round"; x.lineWidth = Math.max(1.2, R * 0.075 * (1 - k * 0.5));
        x.beginPath(); x.moveTo(Math.cos(p.vx) * inner, Math.sin(p.vx) * inner); x.lineTo(Math.cos(p.vx) * outer, Math.sin(p.vx) * outer); x.stroke();
        break;
      }
      case "goo": {
        const shrink = k > 0.55 ? 1 - Ease.inOut((k - 0.55) / 0.45) : 1;
        const s = R * p.size * shrink;
        if (s <= 0.2) break;
        // stretch along the direction of travel — reads as soft goo, stays flat
        const sp = Math.hypot(p.vx, p.vy);
        x.rotate(Math.atan2(p.vy, p.vx));
        const st = 1 + Math.min(0.28, sp * 0.08);
        x.fillStyle = p.color; x.beginPath(); x.ellipse(0, 0, s * st, s / st, 0, 0, Math.PI * 2); x.fill();
        break;
      }
      case "dot": {
        const s = R * p.size * (1 - Ease.inOut(k));
        if (s <= 0.2) break;
        x.fillStyle = p.color; x.beginPath(); x.arc(0, 0, s, 0, Math.PI * 2); x.fill();
        break;
      }
      case "eyebit": {
        const shrink = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        const h = R * p.size * shrink, w = h * 0.42;
        if (h <= 0.3) break;
        x.rotate(p.rot);
        x.fillStyle = p.color; x.beginPath(); x.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); x.fill();
        break;
      }
      case "streak": {
        const e = Ease.out(k);
        const dist = R * (0.3 + p.vy * e);
        const len = R * p.size * 2;
        const a = p.vx;
        x.globalAlpha = clamp(1 - k, 0, 1);
        x.strokeStyle = p.color; x.lineWidth = Math.max(1, R * 0.04); x.lineCap = "round";
        x.beginPath();
        x.moveTo(Math.cos(a) * (dist - len), Math.sin(a) * (dist - len) * 0.6);
        x.lineTo(Math.cos(a) * dist, Math.sin(a) * dist * 0.6);
        x.stroke();
        break;
      }
    }
    x.restore();
  }
}
