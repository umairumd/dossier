/**
 * DOM runtime: canvas sizing (DPR + "spill" so hats/hands/confetti can leave the
 * avatar's box without affecting layout), one shared RAF loop for every live
 * avatar, cursor-follow region, tap/click pokes, offscreen + hidden-tab pausing,
 * reduced-motion, and idle dozing.
 *
 * Framework-free; the React wrapper (components/mascot/mascot.tsx) is thin.
 */
import type { AvatarConfig } from "./avatar";
import { avatarKey } from "./avatar";
import { clamp } from "./core";
import { MascotEngine, type EngineOptions, type MascotState } from "./engine";
import type { Expression } from "./eyes";
import { SHAPES } from "./shapes";

export type FollowMode = "region" | "window" | "none";

export interface Spill { x: number; top: number; bottom: number }

/** Live hero: room for waving hands, hats, particles. */
export const SPILL_LIVE: Spill = { x: 0.5, top: 0.65, bottom: 0.35 };
/** Lists/tables: just enough headroom for hats. */
export const SPILL_STATIC: Spill = { x: 0.14, top: 0.42, bottom: 0.08 };

export interface MountOptions extends EngineOptions {
  /** Footprint in CSS px — the box the avatar occupies in layout (like an <img>). */
  size: number;
  /** How far the canvas extends beyond the box, as fractions of `size`. */
  spill?: Spill;
  /** Share of the box the body fills (0.86 matches the legacy bot). */
  fill?: number;
  /** Eyes follow the pointer: inside a radius ("region"), anywhere ("window"), or never. */
  follow?: FollowMode;
  /** Radius of the follow region in px (default max(260, size × 3.2)). */
  followRadius?: number;
  /** Click/tap pokes it (annoyance ladder). */
  interactive?: boolean;
  /** Doze after this long without user input (live hero only). 0 = never. */
  sleepAfterMs?: number;
}

export interface MascotController {
  engine: MascotEngine;
  canvas: HTMLCanvasElement;
  /** Re-layout for a new footprint size. */
  setSize(px: number): void;
  setFollow(mode: FollowMode, radius?: number): void;
  /** Look at an element or viewport point (e.g. the Submit button) for `ms`. null = release. */
  lookAt(target: Element | { x: number; y: number } | null, ms?: number): void;
  pause(paused: boolean): void;
  destroy(): void;
}

// ── shared input + loop ──────────────────────────────────────────────────────

const pointer = { x: -1e4, y: -1e4, type: "mouse" as string, seen: false };
let lastActivity = typeof performance !== "undefined" ? performance.now() : 0;
const live = new Set<Controller>();
let raf = 0;
let last = 0;
let listening = false;

function onPointer(e: PointerEvent) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.type = e.pointerType || "mouse";
  pointer.seen = true;
  activity();
}
function activity() {
  lastActivity = performance.now();
  for (const c of live) if (c.dozed) { c.dozed = false; c.engine.wake(); }
}
function onVisibility() {
  if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
  else if (live.size && !raf) { last = 0; raf = requestAnimationFrame(tick); }
}
function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
  window.addEventListener("keydown", activity, { passive: true });
  window.addEventListener("scroll", activity, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
}

function tick() {
  const ts = performance.now();
  const dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60;
  last = ts;
  for (const c of live) c.frame(dt, ts);
  raf = live.size && !document.hidden ? requestAnimationFrame(tick) : 0;
  if (!raf) last = 0;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ── controller ───────────────────────────────────────────────────────────────

class Controller implements MascotController {
  engine: MascotEngine;
  canvas: HTMLCanvasElement;
  size: number;
  spill: Spill;
  fill: number;
  follow: FollowMode;
  radius: number;
  sleepAfter: number;
  dozed = false;
  paused = false;
  visible = true;
  private inRegion = false;
  private leftAt = 0;
  private focus: { target: Element | { x: number; y: number }; until: number } | null = null;
  private io?: IntersectionObserver;
  private host: HTMLElement | null;
  private clickHandler?: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, o: MountOptions) {
    this.canvas = canvas;
    this.engine = new MascotEngine({ ...o, reducedMotion: o.reducedMotion ?? prefersReducedMotion() });
    this.size = o.size;
    this.spill = o.spill ?? SPILL_LIVE;
    this.fill = o.fill ?? 0.86;
    this.follow = o.follow ?? "region";
    this.radius = o.followRadius ?? Math.max(260, o.size * 3.2);
    this.sleepAfter = o.sleepAfterMs ?? 0;
    this.host = canvas.parentElement;
    this.layout();
    if (o.interactive && this.host) {
      this.clickHandler = (e: MouseEvent) => {
        const r = this.canvas.getBoundingClientRect();
        const { cx, cy, R } = this.geom();
        if (this.engine.hitTest(e.clientX - r.left, e.clientY - r.top, cx, cy, R)) this.engine.poke();
      };
      this.host.addEventListener("click", this.clickHandler);
    }
    if (typeof IntersectionObserver !== "undefined") {
      this.io = new IntersectionObserver((entries) => { this.visible = entries.some((e) => e.isIntersecting); });
      this.io.observe(canvas);
    }
    listen();
    live.add(this);
    if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
  }

  geom() {
    const sh = SHAPES[this.engine.avatar.shape];
    const R = ((this.size * this.fill * 0.5) / Math.max(sh.ax, sh.ay)) * sh.optical;
    return { cx: this.size * (0.5 + this.spill.x), cy: this.size * (this.spill.top + 0.5), R };
  }

  layout() {
    const W = this.size * (1 + 2 * this.spill.x);
    const H = this.size * (1 + this.spill.top + this.spill.bottom);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    Object.assign(this.canvas.style, {
      position: "absolute",
      left: `${-this.spill.x * this.size}px`,
      top: `${-this.spill.top * this.size}px`,
      width: `${W}px`,
      height: `${H}px`,
      pointerEvents: "none",
    });
  }

  setSize(px: number) { this.size = px; this.radius = Math.max(260, px * 3.2); this.layout(); }
  setFollow(mode: FollowMode, radius?: number) { this.follow = mode; if (radius) this.radius = radius; }
  lookAt(target: Element | { x: number; y: number } | null, ms = 1600) {
    this.focus = target ? { target, until: performance.now() + ms } : null;
  }
  pause(p: boolean) { this.paused = p; }

  private gaze(ts: number) {
    const e = this.engine;
    const r = this.canvas.getBoundingClientRect();
    const { cx, cy } = this.geom();
    const ax = r.left + cx;
    const ay = r.top + cy;
    if (this.focus && ts < this.focus.until) {
      const t = this.focus.target;
      let fx: number; let fy: number;
      if (t instanceof Element) { const b = t.getBoundingClientRect(); fx = b.left + b.width / 2; fy = b.top + b.height / 2; }
      else { fx = t.x; fy = t.y; }
      const span = Math.max(160, Math.hypot(fx - ax, fy - ay));
      e.wander = false;
      e.lookX = clamp(((fx - ax) / span) * 1.2, -1, 1);
      e.lookY = clamp(((fy - ay) / span) * 1.2, -1, 1);
      return;
    }
    this.focus = null;
    if (this.follow === "none" || !pointer.seen || pointer.type === "touch") { e.wander = true; return; }
    const dx = pointer.x - ax;
    const dy = pointer.y - ay;
    if (this.follow === "window") {
      e.wander = false;
      e.lookX = clamp(dx / (window.innerWidth * 0.45), -1, 1);
      e.lookY = clamp(dy / (window.innerHeight * 0.45), -1, 1);
      return;
    }
    const inside = Math.hypot(dx, dy) < this.radius;
    if (inside) {
      if (!this.inRegion && ts - this.leftAt > 3000) e.notice();
      this.inRegion = true;
      e.wander = false;
      e.lookX = clamp((dx / this.radius) * 1.35, -1, 1);
      e.lookY = clamp((dy / this.radius) * 1.35, -1, 1);
    } else {
      if (this.inRegion) this.leftAt = ts;
      this.inRegion = false;
      e.wander = true;
    }
  }

  frame(dt: number, ts: number) {
    if (this.paused || !this.visible) return;
    // late night: nods off after a minute without input instead of the usual delay
    const sleepAfter = this.sleepAfter && this.engine.lateNight ? Math.min(this.sleepAfter, 60_000) : this.sleepAfter;
    if (sleepAfter && !this.dozed && ts - lastActivity > sleepAfter) { this.dozed = true; this.engine.doze(); }
    this.gaze(ts);
    this.engine.update(dt);
    const x = this.canvas.getContext("2d");
    if (!x) return;
    const dpr = this.canvas.width / parseFloat(this.canvas.style.width || "1");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    const { cx, cy, R } = this.geom();
    this.engine.draw(x, cx, cy, R);
  }

  destroy() {
    live.delete(this);
    this.io?.disconnect();
    if (this.clickHandler && this.host) this.host.removeEventListener("click", this.clickHandler);
    this.engine.destroy();
  }
}

/** Mount a live avatar on a canvas. The canvas' parent must be `position: relative` and `size`×`size`. */
export function mount(canvas: HTMLCanvasElement, opts: MountOptions): MascotController {
  return new Controller(canvas, opts);
}

// ── static rendering (lists, tables, notifications) ──────────────────────────

export interface StaticOptions {
  size: number;
  state?: MascotState;
  expression?: Expression;
  spill?: Spill;
  fill?: number;
  mini?: boolean;
  bodyColor?: string;
}

const staticCache = new Map<string, string>();

/** Render one frame to a data URL (cached). Cheap enough for hundreds of list rows. */
export function renderStatic(avatar: AvatarConfig, o: StaticOptions): string {
  const spill = o.spill ?? SPILL_STATIC;
  const fill = o.fill ?? 0.86;
  const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const key = `${avatarKey(avatar)}|${o.size}|${o.state ?? ""}|${o.expression ?? ""}|${dpr}|${spill.x},${spill.top},${spill.bottom}|${fill}|${o.mini ? 1 : 0}|${o.bodyColor ?? ""}`;
  const hit = staticCache.get(key);
  if (hit) return hit;
  const W = o.size * (1 + 2 * spill.x);
  const H = o.size * (1 + spill.top + spill.bottom);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const x = canvas.getContext("2d");
  if (!x) return "";
  const e = new MascotEngine({ avatar, mini: o.mini, reducedMotion: true });
  if (o.bodyColor) {
    const v = parseInt(o.bodyColor.replace("#", ""), 16);
    e.bodyColor = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  if (o.state) e.setState(o.state, true);
  if (o.expression) e.showExpression(o.expression, 3600);
  for (let i = 0; i < 4; i++) e.update(1 / 30);
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sh = SHAPES[avatar.shape];
  const R = ((o.size * fill * 0.5) / Math.max(sh.ax, sh.ay)) * sh.optical;
  e.draw(x, o.size * (0.5 + spill.x), o.size * (spill.top + 0.5), R);
  e.destroy();
  const url = canvas.toDataURL("image/png");
  if (staticCache.size > 400) staticCache.delete(staticCache.keys().next().value as string);
  staticCache.set(key, url);
  return url;
}
