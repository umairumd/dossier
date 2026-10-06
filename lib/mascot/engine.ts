/**
 * MascotEngine — framework-free Canvas 2D character engine.
 *
 * Core motion system ported from Coucou (github.com/Louis-CFM/coucou, MIT source:
 * BotEngine.swift / windows/src/mochi/engine.ts), generalised for Dossier:
 *   • any body shape (shapes.ts) with anchors for eyes, cheeks, badge, hands, accessories
 *   • identity eye styles + universal expressions (eyes.ts)
 *   • accessory slots with animated swaps + hat spring physics (outfits/renderers.ts)
 *   • annoyance ladder (poke → annoyed → angry → furious → explode → respawn)
 *   • drop-box mode (hover a submit button → it opens its mouth), confetti, steam
 *
 * Rendering is pure: draw(ctx, cx, cy, R). DOM concerns (sizing, pointer, loop)
 * live in runtime.ts; React wrappers in components/mascot.
 */
import {
  Ease, type EaseFn, FONT, clamp, hexToRGB, lerp, mix3, now, rgba, roundRectPath, translatedPath, type RGB,
} from "./core";
import { type AvatarConfig, avatarKey, defaultAvatar } from "./avatar";
import { ACCESSORIES, type AccessoryId } from "./catalog";
import { drawEye, EYE_STYLES, type Expression } from "./eyes";
import { drawParticles, emitBurst, emitFloat, emitPop, stepParticles, type Particle } from "./effects";
import { PERSONALITIES, personalityFor, pickIdleAction, type IdleAction, type PersonalityId } from "./idle";
import { ACCESSORY_RENDERERS, type EyeFrame, type Head } from "./outfits/renderers";
import { PALETTES } from "./palettes";
import { SHAPES, type AccessorySlot, type Frame } from "./shapes";

// ── States ───────────────────────────────────────────────────────────────────

export const STATE_IDS = [
  "idle", "working", "thinking", "searching", "approval", "question",
  "error", "finished", "ratelimit", "sleeping", "dizzy",
] as const;
export type MascotState = (typeof STATE_IDS)[number];

type BadgeKind = "dots" | "thought" | "bang" | "question" | "dot";
interface Badge { kind: BadgeKind; color: RGB }

interface StateCfg {
  color: RGB; tint: number; expr: Expression; badge: Badge | null;
  bounces?: boolean; scans?: boolean; breathes?: boolean; zz?: boolean; sweat?: boolean;
  look?: readonly [number, number]; tilt?: number;
}

const C = {
  idle: [0.902, 0.914, 0.933], working: [0.231, 0.62, 1], thinking: [0.545, 0.361, 0.965],
  searching: [0.388, 0.396, 0.949], approval: [0.961, 0.647, 0.141], question: [0.133, 0.827, 0.933],
  error: [0.957, 0.314, 0.369], finished: [0.204, 0.831, 0.6], ratelimit: [0.984, 0.573, 0.235],
  sleeping: [0.58, 0.635, 0.722], dizzy: [0.957, 0.447, 0.714],
} as const satisfies Record<MascotState, RGB>;

export const STATES: Record<MascotState, StateCfg> = {
  idle: { color: C.idle, tint: 0, expr: "neutral", badge: null },
  working: { color: C.working, tint: 0.55, expr: "neutral", badge: { kind: "dots", color: C.working } },
  thinking: { color: C.thinking, tint: 0.55, expr: "neutral", badge: { kind: "thought", color: C.thinking }, look: [0.55, 0.55] },
  searching: { color: C.searching, tint: 0.55, expr: "neutral", badge: { kind: "dots", color: C.searching }, scans: true },
  approval: { color: C.approval, tint: 0.6, expr: "wide", badge: { kind: "bang", color: C.approval }, bounces: true },
  question: { color: C.question, tint: 0.55, expr: "neutral", badge: { kind: "question", color: C.question }, tilt: 0.17 },
  error: { color: C.error, tint: 0.6, expr: "flat", badge: { kind: "dot", color: C.error } },
  finished: { color: C.finished, tint: 0.3, expr: "happy", badge: { kind: "dot", color: C.finished } },
  ratelimit: { color: C.ratelimit, tint: 0.55, expr: "tired", badge: { kind: "dot", color: C.ratelimit }, sweat: true },
  sleeping: { color: C.sleeping, tint: 0.25, expr: "closed", badge: null, breathes: true, zz: true },
  dizzy: { color: C.dizzy, tint: 0.55, expr: "spiral", badge: null },
};

export const STATE_GLOW: Record<MascotState, { color: string; opacity: number }> = {
  idle: { color: "#FFFFFF", opacity: 0.12 }, working: { color: "#3B9EFF", opacity: 0.6 },
  thinking: { color: "#A78BFA", opacity: 0.6 }, searching: { color: "#6366F1", opacity: 0.6 },
  approval: { color: "#F5A524", opacity: 0.6 }, question: { color: "#22D3EE", opacity: 0.6 },
  error: { color: "#F4505E", opacity: 0.6 }, finished: { color: "#34D399", opacity: 0.6 },
  ratelimit: { color: "#F59E0B", opacity: 0.6 }, sleeping: { color: "#FFFFFF", opacity: 0.12 }, dizzy: { color: "#F472B6", opacity: 0 },
};

// ── Emotes ───────────────────────────────────────────────────────────────────

export const EMOTE_IDS = ["love", "surprised", "proud", "wink", "yawn", "happy", "annoyed", "shy", "sad"] as const;
export type Emote = (typeof EMOTE_IDS)[number];
const EMOTE_EXPR: Record<Emote, Expression> = {
  love: "heart", surprised: "surprised", proud: "star", wink: "wink", yawn: "tired",
  happy: "happy", annoyed: "line", shy: "happy", sad: "sad",
};

// ── Sounds (names only; the host decides how to play them) ───────────────────
export type SoundName =
  | "greet" | "slap" | "annoyed" | "angry" | "charge" | "boom" | "land" | "dizzy" | "work" | "think" | "search"
  | "approval" | "question" | "error" | "finish" | "rate" | "sleep" | "love" | "proud" | "wink" | "yawn"
  | "pop" | "gulp" | "approve" | "blip" | "celebrate";
const STATE_SOUND: Partial<Record<MascotState, SoundName>> = {
  working: "work", thinking: "think", searching: "search", approval: "approval", question: "question",
  error: "error", finished: "finish", ratelimit: "rate", sleeping: "sleep", dizzy: "dizzy",
};
const EMOTE_SOUND: Partial<Record<Emote, SoundName>> = {
  love: "love", surprised: "pop", proud: "proud", wink: "wink", yawn: "yawn", happy: "pop", shy: "pop",
};

// ── Annoyance ladder ─────────────────────────────────────────────────────────
/** Pokes needed for each level (accumulated, decays ~1.1/s after 1.4 s of calm). */
export const ANGER_THRESHOLDS = [1, 3, 6, 10] as const;
/** Strength of the flashing red at each burst level (0–3), and flashes per second. */
const RED_LEVEL = [0, 0, 0.55, 0.85];
const RED_HZ = [0, 0, 1.3, 3.2];
/**
 * Two annoyance reactions:
 *   "dizzy" — the original: each tap squashes it with line eyes; 3 quick taps → it spins twice
 *             with spiral eyes and wobbles, then recovers.
 *   "burst" — the ladder: line eyes, flashing red that speeds up (no smoke), then it inflates,
 *             pops into goo + its own eyes, and drops back in.
 */
export const ANNOYANCE_MODES = ["dizzy", "burst"] as const;
export type AnnoyanceMode = (typeof ANNOYANCE_MODES)[number];
const SLAP_WINDOW = 1.7;
const DIZZY_SECONDS = 3.3;

// ── Engine ───────────────────────────────────────────────────────────────────

type PropKey =
  | "yaw" | "pitch" | "roll" | "tilt" | "open" | "sx" | "sy" | "oy" | "ox" | "tint" | "morph" | "hands"
  | "blush" | "es" | "badgeS" | "flash" | "red" | `presence.${AccessorySlot}`;
type TweenKey = readonly [target: number, ms: number, ease: EaseFn];
interface Tween { keys: TweenKey[]; index: number; from: number; startMs: number; onComplete?: () => void }

interface SlotState { id: AccessoryId | null; target: AccessoryId | null; temp: AccessoryId | null }
const SLOTS: AccessorySlot[] = ["body", "neck", "face", "head"];

export interface EngineOptions {
  avatar?: AvatarConfig;
  /** Seed for the default avatar when none is given (user id). */
  seed?: string;
  mini?: boolean;
  reducedMotion?: boolean;
  onSound?: (name: SoundName) => void;
  onStateChange?: (next: MascotState, prev: MascotState) => void;
  /** Fired at each annoyance level change (0–4; dizzy mode: taps 0–2, 3 = dizzy). */
  onAnger?: (level: number) => void;
  /** Idle temperament; defaults to one derived from `seed` (or the avatar). */
  personality?: PersonalityId;
  /** Which annoyance reaction taps trigger (default: the avatar's `reaction`, else "dizzy"). */
  annoyance?: AnnoyanceMode;
}

export class MascotEngine {
  avatar: AvatarConfig;
  isMini: boolean;
  reducedMotion: boolean;
  /** Flat body colour (mini/team mode); null = palette gradient. */
  bodyColor: RGB | null = null;
  onSound: EngineOptions["onSound"];
  onStateChange: EngineOptions["onStateChange"];
  onAnger: EngineOptions["onAnger"];

  /** Gaze input from the runtime, −1…1. */
  lookX = 0;
  lookY = 0;
  /** When true (pointer far away / touch), eyes wander on their own. */
  wander = false;

  state: MascotState = "idle";
  private cfg: StateCfg = STATES.idle;
  private p: Record<PropKey, number> = {
    yaw: 0, pitch: 0, roll: 0, tilt: 0, open: 1, sx: 1, sy: 1, oy: 0, ox: 0, tint: 0, morph: 0, hands: 0,
    blush: 0, es: 1, badgeS: 0, flash: 0, red: 0, "presence.head": 0, "presence.face": 0, "presence.neck": 0, "presence.body": 0,
  };
  private tg = { yaw: 0, pitch: 0, tilt: 0, sx: 1, sy: 1, es: 1 };
  private tweens = new Map<PropKey, Tween>();
  private locks = new Set<PropKey>();
  private particles: Particle[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();

  private col: RGB = C.idle;
  private colT: RGB = C.idle;
  private badge: Badge | null = null;
  private badgeKey = "none";
  private badgeToken = 0;

  private exprOverride: Expression | null = null;
  private exprUntil = 0;
  private permanentExpr: Expression | null = null;
  permanentEmote: Emote | null = null;
  private miniNext = 0;

  private slots: Record<AccessorySlot, SlotState> = {
    head: { id: null, target: null, temp: null }, face: { id: null, target: null, temp: null },
    neck: { id: null, target: null, temp: null }, body: { id: null, target: null, temp: null },
  };

  // mouth / drop box
  private slotH = 0;
  private slotHTarget = 0;
  private slotHVel = 0;
  private chewing = false;
  dropMode: 0 | 1 | 2 = 0;

  // dance
  private dancing = false;
  private danceLevel = 0;

  // physics for floppy accessories
  private phys = { dx: 0, dy: 0, vx: 0, vy: 0, prevYaw: 0, prevOy: 0, prevRoll: 0 };

  // annoyance
  private annoy = 0;
  private lastPoke = 0;
  angerLevel = 0;
  private angerTint = 0;
  private boomCooldownUntil = 0;
  private phase: null | "inflate" | "gone" | "respawn" = null;
  private hidden = false;
  annoyance: AnnoyanceMode = "dizzy";
  private slaps: number[] = [];
  private dizzyUntil = 0;

  // idle life
  personality: PersonalityId = "calm";
  private idleNext = 0;
  private lastIdle: IdleAction | null = null;
  /** Queued idle gaze targets (used only while the cursor isn't being followed). */
  private idleLook: { x: number; y: number; until: number }[] = [];

  // misc timing
  private t0 = now() - Math.random() * 5;
  private nextBlink = now() + 1.5 + Math.random() * 2;
  private waveStart = 0;
  private waveUntil = 0;
  private greetToken = 0;
  private lastAmbient = 0;
  private wanderTarget = { x: 0, y: 0 };
  private wanderNext = 0;
  private dozing: MascotState | null = null;

  constructor(opts: EngineOptions = {}) {
    this.avatar = opts.avatar ?? defaultAvatar(opts.seed ?? "mascot");
    this.isMini = !!opts.mini;
    this.reducedMotion = !!opts.reducedMotion;
    this.onSound = opts.onSound;
    this.onStateChange = opts.onStateChange;
    this.onAnger = opts.onAnger;
    this.annoyance = opts.annoyance ?? this.avatar.reaction ?? "dizzy";
    this.personality = opts.personality ?? personalityFor(opts.seed ?? avatarKey(this.avatar));
    this.idleNext = now() + 1.5 + Math.random() * 3;
    this.applyAccessories(false);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Avatar
  // ════════════════════════════════════════════════════════════════════════════

  setAvatar(avatar: AvatarConfig, animated = true) {
    this.avatar = avatar;
    if (avatar.reaction && avatar.reaction !== this.annoyance) { this.calm(); this.annoyance = avatar.reaction; }
    this.applyAccessories(animated);
  }

  private applyAccessories(animated: boolean) {
    for (const slot of SLOTS) this.setSlot(slot, this.avatar.accessories[slot] ?? null, animated);
  }

  /** Equip/unequip one slot with the exit → enter animation. */
  setSlot(slot: AccessorySlot, id: AccessoryId | null, animated = true) {
    const s = this.slots[slot];
    const key: PropKey = `presence.${slot}`;
    if (!s.temp) s.target = id;
    const want = () => s.temp ?? s.target;
    if (want() === s.id && !this.tweens.has(key)) {
      if (s.id) this.p[key] = 1;
      return;
    }
    this.tweens.delete(key);
    this.locks.delete(key);
    if (!animated || this.reducedMotion) {
      s.id = want();
      this.p[key] = s.id ? 1 : 0;
      return;
    }
    const enter = () => {
      s.id = want();
      this.p[key] = 0;
      if (!s.id) return;
      this.anim(key, [[1, 380, Ease.inOut]], () => this.squash(0.6));
      this.sound("pop");
    };
    if (s.id && this.p[key] > 0.01) this.anim(key, [[0, 180, Ease.inOut]], enter);
    else enter();
  }

  /** Temporarily wear an item (birthday hat, team-complete crown) without changing the saved avatar. */
  wear(id: AccessoryId, ms: number) {
    const slot = ACCESSORIES[id].slot;
    this.slots[slot].temp = id;
    this.setSlot(slot, this.slots[slot].target);
    this.later(ms, () => {
      if (this.slots[slot].temp !== id) return;
      this.slots[slot].temp = null;
      this.setSlot(slot, this.slots[slot].target);
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // States, emotes, beats
  // ════════════════════════════════════════════════════════════════════════════

  /** `quiet` skips the entrance beat (flip/sparks/shake) — e.g. after the report was eaten, or on page load. */
  setState(next: MascotState, force = false, quiet = false) {
    if (this.state === next && !force) return;
    const prev = this.state;
    this.state = next;
    this.cfg = STATES[next];
    this.colT = this.cfg.color;
    if (!this.locks.has("tint")) this.p.tint = this.cfg.tint;
    this.setBadge(this.cfg.badge);
    if (quiet) { this.onStateChange?.(next, prev); return; }
    this.sound(STATE_SOUND[next]);
    switch (next) {
      case "finished":
        this.doRoll(950, 1);
        this.later(500, () => this.emit("spark", 5));
        break;
      case "error":
        this.anim("ox", [[0.08, 50, Ease.out], [-0.08, 70, Ease.inOut], [0.05, 70, Ease.inOut], [0, 90, Ease.out]]);
        break;
      case "approval":
        this.anim("oy", [[-0.2, 150, Ease.out], [0, 300, Ease.back]]);
        break;
      case "dizzy":
        this.doRoll(1300, 2);
        break;
      case "question":
        this.blink();
        break;
      case "ratelimit":
        this.emit("sweat", 1);
        break;
      default:
        if (prev !== "idle" || next !== "idle") this.blink();
    }
    this.onStateChange?.(next, prev);
  }

  triggerEmote(emote: Emote, duration = 1.8) {
    const t = now();
    this.exprOverride = EMOTE_EXPR[emote];
    this.exprUntil = t + duration;
    this.sound(EMOTE_SOUND[emote]);
    switch (emote) {
      case "love":
        this.anim("blush", [[1, 300, Ease.out], [1, (duration - 0.6) * 1000, Ease.lin], [0, 300, Ease.inOut]]);
        this.emit("heart", 4);
        this.anim("oy", [[-0.1, 160, Ease.out], [0, 300, Ease.back]]);
        break;
      case "surprised":
        this.anim("oy", [[-0.3, 140, Ease.out], [0, 380, Ease.back]]);
        this.anim("es", [[1.25, 120, Ease.out], [1, 500, Ease.inOut]]);
        break;
      case "proud":
        this.emit("star", 5);
        this.anim("tilt", [[-0.14, 220, Ease.out], [-0.14, (duration - 0.5) * 1000, Ease.lin], [0, 280, Ease.inOut]]);
        this.anim("blush", [[0.7, 250, Ease.out], [0.7, (duration - 0.5) * 1000, Ease.lin], [0, 300, Ease.inOut]]);
        break;
      case "wink":
        this.anim("tilt", [[0.12, 160, Ease.out], [0.12, (duration - 0.4) * 1000, Ease.lin], [0, 240, Ease.inOut]]);
        break;
      case "yawn":
        this.anim("sy", [[1.12, 500, Ease.inOut], [1, 500, Ease.inOut]]);
        this.anim("sx", [[0.94, 500, Ease.inOut], [1, 500, Ease.inOut]]);
        this.later(700, () => { this.exprOverride = "closed"; this.emit("z", 2); });
        break;
      case "happy":
        this.anim("blush", [[0.6, 200, Ease.out], [0, 600, Ease.inOut]]);
        break;
      case "shy":
        this.anim("blush", [[1, 250, Ease.out], [1, (duration - 0.5) * 1000, Ease.lin], [0, 300, Ease.inOut]]);
        this.anim("pitch", [[-0.35, 250, Ease.out], [-0.35, (duration - 0.5) * 1000, Ease.lin], [0, 300, Ease.inOut]]);
        break;
      case "sad":
        this.anim("sy", [[0.94, 300, Ease.out], [0.94, (duration - 0.6) * 1000, Ease.lin], [1, 300, Ease.inOut]]);
        this.anim("pitch", [[-0.22, 300, Ease.out], [-0.22, (duration - 0.6) * 1000, Ease.lin], [0, 300, Ease.inOut]]);
        break;
      case "annoyed":
        this.exprUntil = t + 0.8;
        this.later(60, () => this.sound("annoyed"));
        break;
    }
  }

  /** Hold an emote's eyes indefinitely (mini bots also loop a behaviour). null clears. */
  setPermanentEmote(emote: Emote | null) {
    this.permanentEmote = emote;
    this.permanentExpr = emote && emote !== "wink" ? EMOTE_EXPR[emote] : null;
    if (this.permanentExpr) { this.exprOverride = this.permanentExpr; this.exprUntil = Infinity; }
    else if (this.exprUntil === Infinity) { this.exprOverride = null; this.exprUntil = 0; }
    this.miniNext = now() + 0.8 + Math.random() * 1.7;
  }

  /** Force an expression for `seconds` (custom beats, debugging). */
  showExpression(expr: Expression, seconds = 1.5) {
    this.exprOverride = expr;
    this.exprUntil = now() + seconds;
  }

  blink() {
    if (this.locks.has("open")) return;
    this.anim("open", [[0.06, 70, Ease.inOut], [1, 130, Ease.out]]);
  }

  squash(strength = 1) {
    const s = strength;
    this.anim("sy", [[1 - 0.22 * s, 70, Ease.out], [1 + 0.1 * s, 130, Ease.out], [1, 170, Ease.inOut]]);
    this.anim("sx", [[1 + 0.16 * s, 70, Ease.out], [1 - 0.05 * s, 130, Ease.out], [1, 170, Ease.inOut]]);
  }

  doRoll(ms: number, turns: number) {
    if (this.reducedMotion) return;
    this.p.roll = 0;
    this.anim("roll", [[Math.PI * 2 * turns, ms, Ease.inOut]], () => { this.p.roll = 0; this.squash(0.6); });
  }

  /** "Hi!" — hands pop out, right hand waves. */
  greet() {
    const t = now();
    const tok = ++this.greetToken;
    this.waveStart = t + 0.45;
    this.waveUntil = t + 1.55;
    this.exprOverride = "happy";
    this.exprUntil = t + 2.0;
    this.anim("oy", [[-0.06, 220, Ease.out], [0, 220, Ease.back]]);
    this.later(250, () => {
      if (this.greetToken !== tok) return;
      this.anim("hands", [[1, 280, Ease.out]]);
      this.anim("sy", [[0.95, 100, Ease.out], [1, 260, Ease.back]]);
      this.anim("sx", [[1.04, 100, Ease.out], [1, 260, Ease.back]]);
      this.sound("greet");
    });
    this.later(550, () => { if (this.greetToken === tok) this.blink(); });
    this.later(1500, () => { if (this.greetToken === tok) this.blink(); });
    this.later(1550, () => {
      if (this.greetToken !== tok) return;
      this.waveUntil = 0;
      this.anim("hands", [[0, 200, Ease.inOut]]);
    });
  }

  private interruptGreet() {
    if (this.p.hands <= 0.01 && now() >= this.waveUntil) return;
    this.greetToken++;
    this.waveUntil = 0;
    this.waveStart = 0;
    this.anim("hands", [[0, 150, Ease.inOut]]);
  }

  /** Cursor arrived after a while away: a little "oh, hi". */
  notice() {
    if (this.phase || this.state === "sleeping") return;
    this.blink();
    if (!this.locks.has("oy")) this.anim("oy", [[-0.07, 120, Ease.out], [0, 260, Ease.back]]);
    if (!this.exprOverride) this.showExpression("wide", 0.45);
  }

  setDancing(on: boolean) { this.dancing = on && !this.reducedMotion; }
  get isDancing() { return this.dancing; }

  emit(type: "heart" | "star" | "spark" | "sweat" | "z", count: number) {
    emitFloat(this.particles, type, this.reducedMotion ? Math.min(count, 1) : count);
  }

  /** Confetti burst (0.4 small – 1 big). */
  celebrate(strength = 0.6) {
    if (this.reducedMotion) { this.emit("spark", 3); return; }
    emitBurst(this.particles, strength, this.bodyStops(), false);
    this.squash(0.8);
    this.sound("celebrate");
  }

  /** Small success hop (end of the original upload sequence). */
  hop() {
    this.anim("oy", [[-0.14, 140, Ease.out], [0, 260, Ease.back]]);
    this.anim("sy", [[1.06, 140, Ease.out], [0.95, 120, Ease.out], [1, 200, Ease.back]]);
  }

  /** Brief attention ping (new notification): hop + "!" badge flash. */
  ping(ms = 2200) {
    this.anim("oy", [[-0.18, 130, Ease.out], [0, 320, Ease.back]]);
    this.blink();
    const prev = this.cfg.badge;
    this.setBadge({ kind: "bang", color: C.approval });
    this.sound("blip");
    this.later(ms, () => { if (this.badge?.kind === "bang" && this.cfg.badge === prev) this.setBadge(prev); });
  }

  // ── drop box ──────────────────────────────────────────────────────────────

  /** 0 = normal, 1 = something is hovering nearby (box, mouth ajar), 2 = ready to receive (mouth wide). */
  setDropMode(level: 0 | 1 | 2) {
    if (level === this.dropMode) return;
    const was = this.dropMode;
    this.dropMode = level;
    if (level > 0 && was === 0) this.animateMorph(1);
    if (level === 0) { this.slotHTarget = 0; this.animateMorph(0); return; }
    this.slotHTarget = level === 1 ? 0.2 : 0.42;
  }

  /** Swallow whatever was dropped, chew, become round again. */
  swallow(then?: () => void) {
    if (this.p.morph < 0.5 && !this.locks.has("morph")) this.animateMorph(1, 300);
    this.gulp();
    this.later(1350, () => { this.dropMode = 0; this.animateMorph(0); then?.(); });
  }

  /** Full "eat a file" beat from idle. */
  feedFile(then?: () => void) {
    this.setDropMode(1);
    this.later(420, () => this.setDropMode(2));
    this.later(850, () => this.swallow(then));
  }

  private gulp() {
    this.slotHTarget = 0.42;
    this.sound("gulp");
    this.later(460, () => {
      this.slotHTarget = 0;
      this.chewing = true;
      this.later(800, () => { this.chewing = false; });
    });
    this.anim("sy", [[0.78, 80, Ease.out], [1.18, 130, Ease.out], [1, 220, Ease.back]]);
    this.anim("sx", [[1.28, 80, Ease.out], [0.92, 130, Ease.out], [1, 220, Ease.back]]);
    this.blink();
  }

  animateMorph(target: number, ms?: number) {
    this.anim("morph", [[target, ms ?? (target > 0.5 ? 550 : 650), Ease.inOut]]);
  }

  // ── annoyance ladder ──────────────────────────────────────────────────────

  /** One click/tap on the avatar. Repeated pokes escalate; calm decays it. */
  poke() {
    if (this.phase) return;
    this.interruptGreet();
    if (this.dozing) { this.wake(); return; }
    if (this.annoyance === "dizzy") { this.slap(); return; }
    this.annoy += 1;
    this.lastPoke = now();
    this.sound("slap");
    this.squash(0.7 + Math.min(this.angerLevel, 3) * 0.12);
    this.anim("red", [[1, 40, Ease.out], [0, 280, Ease.inOut]]); // every tap flashes red
    const level = this.levelFor(this.annoy);
    if (level === 1 && this.angerLevel === 0) {
      this.showExpression("line", 0.8);
      this.later(60, () => this.sound("annoyed"));
    }
    if (level > this.angerLevel) this.setAngerLevel(level);
    else if (level === this.angerLevel && level >= 2) this.anim("ox", [[0.05, 40, Ease.out], [-0.05, 60, Ease.inOut], [0, 60, Ease.out]]);
  }

  /** Original Coucou slap: squash + knock, line eyes; 3 taps within 1.7 s → dizzy spin. */
  private slap() {
    const n = now();
    if (n < this.dizzyUntil) return;
    this.slaps = this.slaps.filter((t) => n - t < SLAP_WINDOW);
    this.slaps.push(n);
    this.lastPoke = n;
    this.annoy = this.slaps.length;
    this.sound("slap");
    this.squash();
    this.phys.vy -= 1.2;
    this.phys.vx += Math.random() < 0.5 ? 0.7 : -0.7;
    if (this.slaps.length >= 3) { this.slaps = []; this.goDizzy(); return; }
    this.showExpression("line", 0.8);
    this.later(60, () => this.sound("annoyed"));
    this.onAnger?.(this.slaps.length);
  }

  /** Spin twice with spiral eyes and a wobbly gaze, then shake it off. */
  goDizzy() {
    const n = now();
    this.dizzyUntil = n + DIZZY_SECONDS;
    this.exprOverride = "spiral";
    this.exprUntil = n + DIZZY_SECONDS;
    this.annoy = 3;
    this.onAnger?.(3);
    this.sound("dizzy");
    this.doRoll(1300, 2);
    this.later(DIZZY_SECONDS * 1000, () => {
      this.annoy = 0;
      this.onAnger?.(0);
      this.blink();
      this.anim("ox", [[0.04, 70, Ease.out], [-0.04, 90, Ease.inOut], [0, 90, Ease.out]]); // shake it off
    });
  }

  /** Calm down immediately (e.g. navigating away). */
  calm() {
    this.annoy = 0;
    this.slaps = [];
    if (this.angerLevel) this.setAngerLevel(0);
  }

  private levelFor(v: number) {
    let lvl = 0;
    ANGER_THRESHOLDS.forEach((th, i) => { if (v >= th) lvl = i + 1; });
    const cooling = now() < this.boomCooldownUntil;
    if (lvl >= 4 && (cooling || this.reducedMotion)) lvl = 3;
    return lvl;
  }

  private setAngerLevel(level: number) {
    const prev = this.angerLevel;
    this.angerLevel = level;
    this.onAnger?.(level);
    if (level >= 2 && prev < 2) this.sound("angry");
    if (level === 3 && prev < 3) { this.sound("angry"); this.anim("oy", [[-0.1, 90, Ease.out], [0, 200, Ease.back]]); }
    if (level === 4) this.explode();
    if (level < 2 && prev >= 2) this.showExpression("line", 1.0); // grumpy cool-down
  }

  /** The big one: inflate (flashing red) → pop into goo → drop back in, dizzy, then sheepish. */
  explode() {
    if (this.phase) return;
    if (this.reducedMotion) { this.anim("flash", [[1, 80, Ease.out], [0, 300, Ease.inOut]]); this.calm(); return; }
    this.phase = "inflate";
    this.sound("charge");
    this.anim("sx", [[1.24, 700, Ease.in]]);
    this.anim("sy", [[1.2, 700, Ease.in]]);
    this.later(700, () => {
      this.phase = "gone";
      this.hidden = true;
      this.p.sx = 1; this.p.sy = 1;
      this.tweens.delete("sx"); this.tweens.delete("sy"); this.locks.delete("sx"); this.locks.delete("sy");
      emitPop(this.particles, this.bodyStops()[0], "rgb(16,18,24)");
      this.anim("flash", [[0.55, 30, Ease.out], [0, 220, Ease.inOut]]);
      this.sound("boom");
    });
    this.later(2000, () => {
      this.phase = "respawn";
      this.hidden = false;
      this.annoy = 0;
      this.angerLevel = 0;
      this.angerTint = 0;
      this.onAnger?.(0);
      this.p.oy = -3.4;
      this.showExpression("spiral", 2.2);
      this.anim("oy", [[0, 520, Ease.in]], () => {
        this.squash(1.2);
        this.sound("land");
        this.later(1700, () => {
          this.triggerEmote("shy", 1.6);
          this.phase = null;
        });
      });
      this.boomCooldownUntil = now() + 20;
    });
  }

  // ── idle life ─────────────────────────────────────────────────────────────

  /** States that are calm enough for idle fidgeting. */
  private static IDLE_STATES: ReadonlySet<MascotState> = new Set(["idle", "finished", "approval", "question", "ratelimit"]);

  private idleTick(n: number) {
    if (n < this.idleNext) return;
    const p = PERSONALITIES[this.personality];
    this.idleNext = n + p.every[0] + Math.random() * (p.every[1] - p.every[0]);
    const busy = this.phase || this.dozing || this.angerLevel || n < this.dizzyUntil || this.p.morph > 0.05
      || this.exprOverride || this.dancing || this.reducedMotion || this.isMini || this.dropMode
      || !MascotEngine.IDLE_STATES.has(this.state) || this.locks.has("oy") || this.locks.has("tilt") || this.locks.has("roll");
    if (busy) return;
    const act = pickIdleAction(p, this.wander, this.lastIdle);
    if (act) this.playIdle(act);
  }

  /** Play one idle action now (also handy for previews). */
  playIdle(act: IdleAction) {
    this.lastIdle = act;
    const n = now();
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const side = Math.random() < 0.5 ? -1 : 1;
    const look = (...pts: [number, number, number][]) => {
      let t = n;
      this.idleLook = pts.map(([x, y, d]) => ({ x, y, until: (t += d) }));
    };
    switch (act) {
      case "glance":
        if (Math.random() < 0.5) this.blink();
        look([side * r(0.6, 0.95), r(-0.3, 0.25), r(0.7, 1.4)]);
        break;
      case "lookAround":
        look([side * 0.85, r(-0.15, 0.1), 0.75], [-side * 0.85, r(-0.15, 0.1), 0.85], [0, 0, 0.3]);
        this.later(720, () => this.blink());
        break;
      case "ponder":
        look([side * 0.5, -0.8, 1.7]);
        this.showExpression("flat", 1.5);
        this.anim("tilt", [[side * 0.1, 260, Ease.out], [side * 0.1, 1100, Ease.lin], [0, 300, Ease.inOut]]);
        break;
      case "peekDown":
        look([r(-0.3, 0.3), 0.85, 1.3]);
        this.later(1250, () => this.blink());
        break;
      case "slowBlink":
        if (!this.locks.has("open")) this.anim("open", [[0.05, 240, Ease.inOut], [0.05, 160, Ease.lin], [1, 300, Ease.out]]);
        break;
      case "doubleBlink":
        this.blink();
        this.later(240, () => this.blink());
        break;
      case "squint":
        this.showExpression("happy", 0.9);
        this.anim("blush", [[0.35, 160, Ease.out], [0, 600, Ease.inOut]]);
        break;
      case "sleepyLids":
        this.showExpression("tired", r(1.4, 2.2));
        break;
      case "curious":
        this.showExpression("wide", 0.55);
        this.anim("tilt", [[side * 0.16, 180, Ease.out], [side * 0.16, 900, Ease.lin], [0, 260, Ease.inOut]]);
        if (this.wander) look([side * 0.7, -0.2, 1.1]);
        break;
      case "wink":
        this.showExpression("wink", 0.6);
        this.anim("tilt", [[0.1, 140, Ease.out], [0.1, 380, Ease.lin], [0, 220, Ease.inOut]]);
        break;
      case "sway":
        this.anim("tilt", [[side * 0.07, 650, Ease.inOut], [-side * 0.07, 1300, Ease.inOut], [0, 650, Ease.inOut]]);
        break;
      case "hop":
        this.hop();
        break;
      case "wiggle":
        this.anim("sx", [[1.07, 90, Ease.out], [0.95, 110, Ease.inOut], [1.03, 110, Ease.inOut], [1, 150, Ease.out]]);
        this.anim("sy", [[0.94, 90, Ease.out], [1.05, 110, Ease.inOut], [0.98, 110, Ease.inOut], [1, 150, Ease.out]]);
        break;
      case "nod":
        this.anim("oy", [[0.03, 160, Ease.out], [0, 200, Ease.inOut], [0.03, 160, Ease.out], [0, 220, Ease.out]]);
        look([0, 0.45, 0.18], [0, 0, 0.2], [0, 0.45, 0.18], [0, 0, 0.25]);
        if (!this.wander) this.anim("sy", [[0.96, 160, Ease.out], [1, 200, Ease.inOut], [0.96, 160, Ease.out], [1, 220, Ease.out]]);
        break;
      case "stretch":
        this.showExpression("closed", 0.75);
        this.anim("sy", [[1.12, 450, Ease.inOut], [0.9, 140, Ease.out], [1, 320, Ease.back]]);
        this.anim("sx", [[0.92, 450, Ease.inOut], [1.08, 140, Ease.out], [1, 320, Ease.back]]);
        break;
      case "hum":
        this.showExpression("happy", 2);
        this.anim("tilt", [[0.08, 350, Ease.inOut], [-0.08, 700, Ease.inOut], [0.06, 600, Ease.inOut], [0, 350, Ease.inOut]]);
        break;
      case "shyBlush":
        this.anim("blush", [[0.8, 250, Ease.out], [0.8, 800, Ease.lin], [0, 450, Ease.inOut]]);
        if (this.wander) look([side * 0.55, 0.6, 1.2], [side * 0.2, 0.1, 0.5]);
        else this.showExpression("happy", 1.1);
        break;
      case "yawn":
        this.anim("sy", [[1.1, 500, Ease.inOut], [1, 500, Ease.inOut]]);
        this.anim("sx", [[0.95, 500, Ease.inOut], [1, 500, Ease.inOut]]);
        this.showExpression("tired", 0.6);
        this.later(600, () => this.showExpression("closed", 0.9));
        break;
    }
  }

  // ── idle doze ─────────────────────────────────────────────────────────────

  /** Long inactivity: yawn, then sleep. */
  doze() {
    if (this.dozing || this.phase) return;
    this.dozing = this.state;
    this.triggerEmote("yawn");
    this.later(1300, () => { if (this.dozing) this.setState("sleeping"); });
  }

  /** Activity again: blink awake, restore what it was doing. */
  wake() {
    if (!this.dozing) return;
    const back = this.dozing;
    this.dozing = null;
    this.setState(back === "sleeping" ? "idle" : back);
    this.showExpression("wide", 0.4);
    this.anim("oy", [[-0.12, 120, Ease.out], [0, 280, Ease.back]]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Internals
  // ════════════════════════════════════════════════════════════════════════════

  private sound(name?: SoundName) { if (name && this.onSound) this.onSound(name); }

  private later(ms: number, fn: () => void) {
    const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
    this.timers.add(id);
  }

  destroy() {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
  }

  private setBadge(b: Badge | null) {
    const key = b ? `${b.kind}-${b.color.join(",")}` : "none";
    if (key === this.badgeKey) return;
    this.badgeKey = key;
    const tok = ++this.badgeToken;
    this.anim("badgeS", [[0, 90, Ease.inOut]]);
    this.later(100, () => {
      if (tok !== this.badgeToken) return;
      this.badge = b;
      if (b) this.anim("badgeS", [[1, 280, Ease.back]]);
    });
  }

  private anim(prop: PropKey, keys: TweenKey[], onComplete?: () => void) {
    this.tweens.set(prop, { keys, index: 0, from: this.p[prop], startMs: performance.now(), onComplete });
    this.locks.add(prop);
  }

  private bodyStops(): [string, string] {
    if (this.bodyColor) return [rgba(this.bodyColor), rgba(mix3(this.bodyColor, [0, 0, 0], 0.25))];
    const pal = PALETTES[this.avatar.palette];
    return [pal.mid, pal.mid];
  }

  /** Expression currently shown (useful for tests / aria labels). */
  currentExpression(): Expression {
    if (this.p.morph > 0.5) {
      if (this.chewing) return "happy";
      if (this.slotHTarget > 0.05 || this.slotH > 0.1) return "cup";
    }
    if (this.phase === "respawn" && this.exprOverride) return this.exprOverride;
    // burst ladder keeps squeezed line eyes (no angry brows); dizzy mode uses its own overrides
    if (this.phase === "inflate" || this.angerLevel >= 1) return "line";
    if (this.exprOverride) return this.exprOverride;
    if (this.dancing && this.danceLevel > 0.15 && !this.isMini && (this.state === "idle" || this.state === "finished")) return "happy";
    return this.cfg.expr;
  }

  update(dt: number) {
    const n = now();
    const nowMs = performance.now();

    for (const [prop, tw] of [...this.tweens.entries()]) {
      const k = tw.keys[tw.index];
      const prog = Math.min(1, Math.max(0, (nowMs - tw.startMs) / Math.max(1, k[1])));
      this.p[prop] = tw.from + (k[0] - tw.from) * k[2](prog);
      if (prog >= 1) {
        tw.from = k[0];
        tw.index += 1;
        tw.startMs = nowMs;
        if (tw.index >= tw.keys.length) {
          if (this.tweens.get(prop) === tw) { this.tweens.delete(prop); this.locks.delete(prop); }
          tw.onComplete?.();
        }
      }
    }

    const t = n - this.t0;
    const calm = this.reducedMotion;

    // gaze
    let ty = this.lookX * 0.62;
    let tp = -this.lookY * 0.5;
    if (this.wander || this.isMini) {
      // each personality wanders differently (wide & quick, slow & small, mostly downward…)
      const w = PERSONALITIES[this.personality].wander;
      if (n > this.wanderNext) {
        this.wanderTarget = { x: (Math.random() * 2 - 1) * w.x, y: (Math.random() * 2 - 1) * w.y + w.bias };
        this.wanderNext = n + w.hold[0] + Math.random() * (w.hold[1] - w.hold[0]);
      }
      ty = this.wanderTarget.x * (this.isMini ? 0.62 : 0.5);
      tp = -this.wanderTarget.y * (this.isMini ? 0.5 : 0.4);
      // idle gaze actions (glance, look around, ponder, peek down) take over while queued
      while (this.idleLook.length && n > this.idleLook[0].until) this.idleLook.shift();
      if (this.idleLook.length) { ty = this.idleLook[0].x * 0.62; tp = -this.idleLook[0].y * 0.5; }
    } else if (this.idleLook.length) this.idleLook = [];
    if (this.cfg.look) { ty = ty * 0.35 + this.cfg.look[0] * 0.55; tp = tp * 0.3 + this.cfg.look[1] * 0.5; }
    if (this.cfg.scans && !calm) { ty = Math.sin(t * 2.6) * 0.6; tp = -0.06; }
    if (this.state === "sleeping") { ty = 0; tp = -0.14; }
    if ((this.state === "dizzy" || n < this.dizzyUntil) && !calm) ty = Math.sin(t * 9) * 0.25;
    this.tg.yaw = ty;
    this.tg.pitch = this.hatPitchLimit(tp);
    this.tg.tilt = this.cfg.tilt ?? 0;
    if (n > this.waveStart && n < this.waveUntil) this.tg.tilt = -0.06 + Math.sin(2 * Math.PI * 1.2 * (n - this.waveStart)) * 0.07;

    const kGen = 1 - Math.pow(0.0008, dt);
    const bounce = this.cfg.bounces && !calm ? -Math.abs(Math.sin(t * 5.2)) * 0.07 : 0;
    if (!this.locks.has("oy")) this.p.oy += (bounce - this.p.oy) * kGen;

    if (this.cfg.breathes && !calm) {
      const amp = this.isMini ? 0.07 : 0.035;
      this.tg.sy = 1 + Math.sin(t * 1.8) * amp;
      this.tg.sx = 1 - Math.sin(t * 1.8) * amp * 0.57;
    } else if (this.isMini && !calm) {
      this.tg.sy = 1 + Math.sin(t * 2.2) * 0.04;
      this.tg.sx = 1 - Math.sin(t * 2.2) * 0.02;
    } else {
      this.tg.sy = 1;
      this.tg.sx = 1;
    }
    if (this.isMini && n > this.miniNext) this.miniBehaviour();

    const kLook = 1 - Math.pow(0.0025, dt);
    if (!this.locks.has("yaw")) this.p.yaw += (this.tg.yaw - this.p.yaw) * kLook;
    if (!this.locks.has("pitch")) this.p.pitch += (this.tg.pitch - this.p.pitch) * kLook;
    if (!this.locks.has("tilt")) this.p.tilt += (this.tg.tilt - this.p.tilt) * kGen;
    if (!this.locks.has("sy")) this.p.sy += (this.tg.sy - this.p.sy) * kGen;
    if (!this.locks.has("sx")) this.p.sx += (this.tg.sx - this.p.sx) * kGen;
    if (!this.locks.has("es")) this.p.es += (this.tg.es - this.p.es) * kGen;
    this.col = mix3(this.col, this.colT, 1 - Math.pow(0.002, dt));

    // blinking
    if (n > this.nextBlink) {
      if (this.state !== "sleeping" && this.state !== "dizzy" && !this.phase && this.currentExpression() !== "wink") {
        this.blink();
        if (Math.random() < 0.22) this.later(230, () => this.blink());
      }
      this.nextBlink = n + 2.2 + Math.random() * 3.2;
    }
    if (this.exprOverride && n > this.exprUntil) {
      this.exprOverride = this.permanentExpr;
      if (this.permanentExpr) this.exprUntil = Infinity;
    }

    // ambient particles
    if (n - this.lastAmbient > 1.3) {
      this.lastAmbient = n;
      if (this.cfg.zz) this.emit("z", 1);
      if (!this.isMini && this.cfg.sweat && Math.random() < 0.5) this.emit("sweat", 1);
    }

    // annoyance decay + steam
    if (!this.phase && this.annoy > 0 && n - this.lastPoke > 1.4) {
      this.annoy = Math.max(0, this.annoy - dt * 1.1);
      const lvl = this.levelFor(this.annoy);
      if (lvl < this.angerLevel) this.setAngerLevel(lvl);
    }
    const tintTarget = this.phase === "inflate" ? 0.95 : RED_LEVEL[Math.min(3, this.angerLevel)];
    this.angerTint += (tintTarget - this.angerTint) * (1 - Math.pow(0.01, dt));

    this.idleTick(n);

    this.particles = stepParticles(this.particles, dt);

    // mouth spring ω₀ = 2π/0.25, ζ = 0.6
    const omega = (2 * Math.PI) / 0.25;
    const acc = omega * omega * (this.slotHTarget - this.slotH) - 2 * 0.6 * omega * this.slotHVel;
    this.slotHVel += acc * dt;
    this.slotH = Math.max(0, this.slotH + this.slotHVel * dt);

    // dance fade in 0.3 s / out 0.5 s
    const dT = this.dancing ? 1 : 0;
    if (this.danceLevel < dT) this.danceLevel = Math.min(dT, this.danceLevel + dt / 0.3);
    else if (this.danceLevel > dT) this.danceLevel = Math.max(dT, this.danceLevel - dt / 0.5);

    // accessory spring physics
    if (dt > 0) {
      const ph = this.phys;
      const yawVel = (this.p.yaw - ph.prevYaw) / dt;
      const oyVel = (this.p.oy - ph.prevOy) / dt;
      const rollVel = (this.p.roll - ph.prevRoll) / dt;
      ph.prevYaw = this.p.yaw; ph.prevOy = this.p.oy; ph.prevRoll = this.p.roll;
      const centrifugal = this.hasAccessories() ? rollVel * 0.18 : 0;
      const tDx = clamp(-yawVel * 0.35 - this.p.tilt * 2 + centrifugal, -1, 1);
      const tDy = clamp(oyVel * 0.5, -1, 1);
      const h = Math.min(dt, 1 / 30);
      ph.vx += (60 * (tDx - ph.dx) - 9 * ph.vx) * h;
      ph.vy += (60 * (tDy - ph.dy) - 9 * ph.vy) * h;
      ph.dx += ph.vx * h;
      ph.dy += ph.vy * h;
    }
  }

  private miniBehaviour() {
    const n = now();
    switch (this.permanentEmote) {
      case "happy":
        if (this.locks.has("oy")) { this.miniNext = n + 0.4; return; }
        this.anim("oy", [[-0.3, 120, Ease.out], [0.03, 200, Ease.inOut], [0, 160, Ease.back]]);
        this.anim("sy", [[0.82, 80, Ease.out], [1.18, 130, Ease.out], [0.88, 160, Ease.inOut], [1, 200, Ease.back]]);
        this.anim("sx", [[1.15, 80, Ease.out], [0.88, 130, Ease.out], [1.06, 160, Ease.inOut], [1, 200, Ease.back]]);
        this.miniNext = n + 2.2 + Math.random() * 1.2;
        break;
      case "annoyed":
        if (this.locks.has("yaw")) { this.miniNext = n + 0.5; return; }
        this.anim("yaw", [[-0.65, 50, Ease.out], [0.65, 90, Ease.inOut], [-0.5, 80, Ease.inOut], [0.4, 75, Ease.inOut], [-0.2, 70, Ease.inOut], [0, 140, Ease.out]]);
        this.miniNext = n + 3.0 + Math.random() * 2.5;
        break;
      case "wink":
        this.showExpression("wink", 0.55);
        this.anim("tilt", [[0.13, 100, Ease.out], [0.13, 320, Ease.lin], [0, 200, Ease.inOut]]);
        this.miniNext = n + 2.2 + Math.random() * 2.0;
        break;
      case "love":
        this.emit("heart", 2);
        this.anim("tilt", [[-0.1, 180, Ease.out], [0.1, 340, Ease.inOut], [0, 220, Ease.inOut]]);
        this.miniNext = n + 2.6 + Math.random() * 1.5;
        break;
      default:
        this.miniNext = n + 3.0 + Math.random() * 2.0;
    }
  }

  private hasAccessories() {
    return SLOTS.some((s) => this.slots[s].id && this.p[`presence.${s}`] > 0.05);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Drawing
  // ════════════════════════════════════════════════════════════════════════════

  /** Point-in-body test in the same coordinates as draw(). */
  hitTest(px: number, py: number, cx: number, cy: number, R: number) {
    const sh = SHAPES[this.avatar.shape];
    const dx = (px - cx) / (R * sh.ax * 1.08);
    const dy = (py - (cy + this.p.oy * R)) / (R * sh.ay * 1.1);
    return dx * dx + dy * dy <= 1;
  }

  /** Draw the full character with its body centred at (cx, cy); R sets the scale. */
  draw(x: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
    const sh = SHAPES[this.avatar.shape];
    const rx = R * sh.ax;
    const ry = R * sh.ay;
    const t = now() - this.t0;
    const shakeAmp = this.phase === "inflate" ? 0.02 + 0.06 * this.p.sx - 0.06 : this.angerLevel >= 3 ? 0.035 : this.angerLevel === 2 ? 0.012 : 0;
    const shake = this.reducedMotion ? 0 : Math.sin(t * 61) * shakeAmp + Math.sin(t * 37) * shakeAmp * 0.5;
    const bx = cx + (this.p.ox + shake) * R;
    const by = cy + this.p.oy * R;

    x.save();
    this.applyDance(x, R, bx, by + ry);

    if (!this.hidden) {
      this.drawHands(x, R, rx, ry, bx, by);

      x.save();
      x.translate(bx, by);
      if (this.p.tilt) x.rotate(this.p.tilt);
      const rigid = this.hasAccessories();
      if (rigid && this.p.roll) x.rotate(this.p.roll);
      x.scale(this.p.sx, this.p.sy);

      const body = this.bodyPath(sh.outline(96, t), rx, ry, R);
      const eyes = this.eyeFrames(R, rx, ry, rigid);
      const showAcc = this.p.morph < 0.3 && R > 7;

      if (showAcc) for (const slot of SLOTS) this.drawSlot(x, slot, "back", R, rx, ry, body, eyes);
      this.drawBody(x, body, R, rx, ry);
      this.drawCheeks(x, body, R, rx, ry);
      this.drawEyes(x, body, eyes, R);
      if (this.p.morph > 0.05) this.drawMouth(x, body, R);
      if (showAcc) for (const slot of SLOTS) this.drawSlot(x, slot, "front", R, rx, ry, body, eyes);
      x.restore();

      if (this.badge && this.p.badgeS > 0.01 && this.p.morph < 0.25 && this.angerLevel < 3 && !this.phase) {
        this.drawBadge(x, this.badge, R, bx + sh.badge.x * rx * this.p.sx, by + sh.badge.y * ry * this.p.sy);
      }
    }
    x.restore();

    if (this.p.flash > 0.01) {
      const g = x.createRadialGradient(bx, by, 0, bx, by, R * 1.5);
      g.addColorStop(0, `rgba(255,255,255,${0.75 * this.p.flash})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.beginPath(); x.arc(bx, by, R * 1.5, 0, Math.PI * 2); x.fill();
    }
    drawParticles(x, this.particles, R, bx, by);
  }

  private applyDance(x: CanvasRenderingContext2D, R: number, px: number, py: number) {
    if (this.danceLevel <= 0.001) return;
    const beat = (now() * 112) / 60;
    const hop = Math.abs(Math.sin(Math.PI * beat));
    const land = Math.pow(1 - hop, 6);
    const l = this.danceLevel;
    x.translate(px + 0.08 * R * Math.sin(Math.PI * beat) * l, py - 0.2 * R * hop * l);
    x.rotate(0.1 * Math.sin(Math.PI * beat) * l);
    x.scale(1 + 0.045 * land * l, 1 - 0.06 * land * l);
    x.translate(-px, -py);
  }

  private bodyPath(pts: Float32Array, rx: number, ry: number, R: number) {
    const m = this.p.morph;
    const p = new Path2D();
    const n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      let px = pts[i * 2] * rx;
      let py = pts[i * 2 + 1] * ry;
      if (m >= 0.005) {
        const a = Math.atan2(pts[i * 2 + 1], pts[i * 2]);
        const q = squirclePoint(Math.cos(a), Math.sin(a), R * 1.0, R * 0.94, 5.5);
        px = lerp(px, q.x, m);
        py = lerp(py, q.y, m);
      }
      if (i === 0) p.moveTo(px, py);
      else p.lineTo(px, py);
    }
    p.closePath();
    return p;
  }

  /** Flat fill: one solid colour per body (palette "mid", or the skin colour). */
  private bodyFill(): string {
    if (this.bodyColor) return rgba(this.bodyColor);
    const pal = PALETTES[this.avatar.palette];
    const skin = this.slots.body.id ? ACCESSORY_RENDERERS[this.slots.body.id]?.bodyColors : undefined;
    if (skin && this.p["presence.body"] > 0.01) {
      return rgba(mix3(hexToRGB(pal.mid), hexToRGB(skin[1]), this.p["presence.body"]));
    }
    return pal.mid;
  }

  private drawBody(x: CanvasRenderingContext2D, body: Path2D, _R: number, _rx: number, _ry: number) {
    x.fillStyle = this.bodyFill();
    x.fill(body);
    // States show through the badge, eyes, motion and the glow behind the avatar — no body tint.
    // Burst annoyance: the body flashes red — once per tap, then on a beat that speeds up
    // with each level, and strobes while it inflates.
    const hz = this.phase === "inflate" ? 7 : RED_HZ[Math.min(3, this.angerLevel)];
    const wave = this.reducedMotion ? 0.6 : hz ? clamp((Math.sin(now() * Math.PI * 2 * hz) + 0.25) * 1.8, 0, 1) : 0;
    const red = Math.max(this.p.red * 0.9, this.angerTint * wave);
    if (red > 0.01) {
      x.fillStyle = `rgba(239,68,68,${Math.min(0.95, red)})`;
      x.fill(body);
    }
  }

  private drawCheeks(x: CanvasRenderingContext2D, body: Path2D, R: number, rx: number, ry: number) {
    const sh = SHAPES[this.avatar.shape];
    const style = this.avatar.cheeks;
    const base = style === "soft" ? 0.35 : style === "rosy" ? 0.62 : 0;
    const val = Math.max(this.p.blush, base) * (1 - this.p.morph);
    const freckles = style === "freckles" && this.p.morph < 0.5;
    if (val < 0.01 && !freckles) return;
    x.save();
    x.clip(body);
    // Cheeks sit on the same face sphere as the eyes, so they move with the gaze
    // (left/right AND up/down) and never drift under the eyes.
    const f = sh.face;
    const fcx = f.cx * rx, fcy = f.cy * ry, frx = f.rx * rx, fry = f.ry * ry;
    const cp0 = Math.asin(clamp(-(sh.cheeks.y * ry - fcy) / fry, -0.95, 0.95));
    for (const sd of [-1, 1]) {
      const cy0 = sd * Math.asin(clamp((sh.cheeks.x * rx) / (frx * Math.cos(cp0)), -0.95, 0.95));
      const yaw = cy0 + this.p.yaw;
      const pitch = cp0 + this.p.pitch;
      const vis = Math.cos(yaw) * Math.cos(pitch);
      if (vis <= 0.05) continue;
      const cx = fcx + Math.sin(yaw) * Math.cos(pitch) * frx;
      const cy = fcy - Math.sin(pitch) * fry;
      const fx = Math.max(0.25, Math.cos(yaw));
      const fy = Math.max(0.25, Math.cos(pitch));
      if (val > 0.01) {
        x.fillStyle = `rgba(255,110,140,${0.55 * val})`;
        x.beginPath(); x.ellipse(cx, cy, R * 0.16 * fx, R * 0.1 * fy, 0, 0, Math.PI * 2); x.fill();
      }
      if (freckles) {
        x.fillStyle = "rgba(120,60,30,0.45)";
        for (const [dx, dy] of [[-0.06, -0.02], [0.05, -0.04], [0.0, 0.04]]) {
          x.beginPath(); x.arc(cx + dx * R * fx, cy + dy * R * fy, Math.max(0.6, R * 0.022), 0, Math.PI * 2); x.fill();
        }
      }
    }
    x.restore();
  }

  private eyeFrames(R: number, rx: number, ry: number, rigid: boolean): EyeFrame[] {
    const sh = SHAPES[this.avatar.shape];
    const st = EYE_STYLES[this.avatar.eyes.style];
    const f = sh.face;
    const m = this.p.morph;
    const out: EyeFrame[] = [];
    const mult = (this.isMini ? 1.45 : 1) * this.avatar.eyes.size;
    for (const sd of [-1, 1]) {
      const eyeYaw = sd * st.sp * this.avatar.eyes.spacing + this.p.yaw;
      let eyePitch = st.p + this.p.pitch + (rigid ? 0 : this.p.roll);
      eyePitch = ((((eyePitch + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
      const cp = Math.cos(eyePitch);
      const visible = Math.cos(eyeYaw) * cp > 0.04;
      const fcx = lerp(f.cx * rx, 0, m);
      const fcy = lerp(f.cy * ry, 0, m);
      const frx = lerp(f.rx * rx, R, m);
      const fry = lerp(f.ry * ry, R * 0.94, m);
      out.push({
        sd, visible,
        x: fcx + Math.sin(eyeYaw) * cp * frx,
        y: fcy - Math.sin(eyePitch) * fry - (sd > 0 ? st.stagger * R * (1 - m) : 0) + (m > 0 ? R * 0.14 * m : 0),
        fx: lerp(Math.max(0.18, Math.cos(eyeYaw)), 1, m * 0.7),
        fy: lerp(Math.max(0.18, cp), 1, m * 0.7),
        w: Math.max(1.4, R * st.w * mult * this.p.es),
        h: Math.max(1.4, R * st.h * mult * this.p.es),
      });
    }
    return out;
  }

  private drawEyes(x: CanvasRenderingContext2D, body: Path2D, eyes: EyeFrame[], _R: number) {
    const st = EYE_STYLES[this.avatar.eyes.style];
    const expr = this.currentExpression();
    const ink = this.isMini ? "rgba(10,12,18,0.9)" : "rgba(8,10,14,0.86)";
    const t = now();
    x.save();
    x.clip(body);
    x.fillStyle = ink;
    x.strokeStyle = ink;
    for (const e of eyes) {
      if (!e.visible) continue;
      x.save();
      x.translate(e.x, e.y);
      if (st.tilt && expr !== "heart" && expr !== "star" && expr !== "spiral") x.rotate(st.tilt * (1 - this.p.morph));
      x.scale(e.fx, e.fy);
      // during a wink the open eye stays fully open (no random blink on top of it)
      drawEye(x, expr, st, e.w, e.h, e.sd, expr === "wink" ? 1 : this.p.open, t, ink);
      x.restore();
    }
    x.restore();
  }

  /**
   * Fitting frame for an accessory slot. "crown"-fit items are kept to a natural, roughly
   * round width on wide bodies (a crown shouldn't stretch across a pebble).
   */
  private slotHead(slot: AccessorySlot, R: number, rx: number, ry: number, pitch: number, eyes?: EyeFrame[]) {
    const sh = SHAPES[this.avatar.shape];
    const fr: Frame = sh.frames[slot];
    const id = this.slots[slot].id;
    const def = id ? ACCESSORY_RENDERERS[id] : undefined;
    const tx = fr.cx * rx;
    const ty = fr.cy * ry;
    let hrx = rx * fr.rx;
    const hry = ry * fr.ry;
    if (def?.fit === "crown") hrx = Math.min(hrx, hry * 1.02);
    const head: Head = {
      // glasses are sized to the eyes (not the frame), everything else to its frame
      R: slot === "face" ? R : Math.sqrt(hrx * hry),
      rx: hrx, ry: hry, view: -0.3,
      yaw: this.p.yaw, pitch,
      phys: { dx: this.phys.dx, dy: this.phys.dy },
      eyes: eyes?.map((e) => ({ ...e, x: e.x - tx, y: e.y - ty, w: e.w, h: e.h })),
      body: { x: -tx, y: -ty },
      viewMax: def?.viewMax,
    };
    return { head, tx, ty };
  }

  /**
   * Highest gaze pitch (looking up) at which the eyes stay clear of the head item's brim.
   * Works in R = 1 units, so it's independent of render size.
   */
  private hatPitchLimit(pitch: number): number {
    const id = this.slots.head.id;
    if (!id || this.p["presence.head"] < 0.5 || this.p.morph > 0.05) return pitch;
    const def = ACCESSORY_RENDERERS[id];
    if (!def?.brimY) return pitch;
    const sh = SHAPES[this.avatar.shape];
    const st = EYE_STYLES[this.avatar.eyes.style];
    const f = sh.face;
    const h = st.h * (this.isMini ? 1.45 : 1) * this.avatar.eyes.size;
    const margin = 0.06;
    const ok = (pt: number) => {
      const ep = st.p + pt;
      const eyeTop = f.cy * sh.ay - Math.sin(ep) * f.ry * sh.ay - st.stagger - (h / 2) * Math.max(0.18, Math.cos(ep));
      const { head, ty } = this.slotHead("head", 1, sh.ax, sh.ay, pt);
      return eyeTop >= def.brimY!(head) + ty + margin;
    };
    if (ok(pitch)) return pitch;
    let lo = -0.6, hi = pitch;
    if (!ok(lo)) return lo;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
    return lo;
  }

  private drawSlot(
    x: CanvasRenderingContext2D, slot: AccessorySlot, pass: "back" | "front",
    R: number, rx: number, ry: number, body: Path2D, eyes: EyeFrame[],
  ) {
    const id = this.slots[slot].id;
    if (!id) return;
    const def = ACCESSORY_RENDERERS[id];
    const pres = this.p[`presence.${slot}`];
    if (!def || pres <= 0.01) return;
    const fn = pass === "back" ? def.back : def.front;
    if (!fn) return;
    // hats tip with the head; neck/body items barely move with the gaze
    const { head, tx, ty } = this.slotHead(slot, R, rx, ry, slot === "head" ? this.p.pitch : this.p.pitch * 0.5, eyes);
    x.save();
    x.globalAlpha *= clamp(pres * 1.6, 0, 1);
    const drop = (1 - Ease.back(clamp(pres, 0, 1))) * R * 0.9;
    x.translate(tx, ty - (slot === "head" ? drop : drop * 0.3));
    if (pass === "back") (fn as (c: CanvasRenderingContext2D, h: Head) => void)(x, head);
    else (fn as (c: CanvasRenderingContext2D, h: Head, p: Path2D) => void)(x, head, translatedPath(body, -tx, -ty));
    x.restore();
  }

  /**
   * Box mouth (original upload-sequence layout): a pill-shaped hole INSIDE the box,
   * with body colour all around it, anchored near the top and opening downward.
   * Flat: one dark fill, no rim or lip highlights.
   */
  private drawMouth(x: CanvasRenderingContext2D, body: Path2D, R: number) {
    const m = this.p.morph;
    const hH = this.slotH * R * m;
    if (hH < 0.8) return;
    const boxRx = R * 1.0;
    const boxRy = R * 0.94;
    const hW = (2 * boxRx - 2 * 0.16 * R) * m;
    const hX = -hW / 2;
    const hY = -boxRy + 0.14 * R;
    x.save();
    x.clip(body);
    roundRectPath(x, hX, hY, hW, hH, Math.min(hW / 2, hH / 2));
    x.fillStyle = "rgb(16,17,22)";
    x.fill();
    x.restore();
  }

  private drawHands(x: CanvasRenderingContext2D, R: number, rx: number, ry: number, cx: number, cy: number) {
    if (this.p.hands <= 0.01 || this.isMini || R <= 14) return;
    const sh = SHAPES[this.avatar.shape];
    const n = now();
    const bodyH = 2 * ry;
    const hew = 0.3 * R * 0.88 * this.p.hands;
    const heh = 0.26 * R * 0.88 * this.p.hands;
    const hwB = rx * this.p.sx;
    const hhB = ry * this.p.sy;
    const waving = n >= this.waveStart && this.waveStart > 0 && n < this.waveUntil;
    for (const sd of [-1, 1]) {
      let lx: number;
      let ly: number;
      let rot = 0;
      const restX = sd * hwB * sh.hands.x;
      const restY = hhB * sh.hands.y;
      if (sd > 0 && waving) {
        const wt = n - this.waveStart;
        const rise = 1 - Math.pow(1 - Math.min(1, wt / 0.18), 3);
        const waveX = hwB * (sh.hands.x + 0.04) + Math.cos(13 * wt) * 0.06 * bodyH;
        const waveY = -hhB * 0.15 - Math.sin(13 * wt) * 0.14 * bodyH;
        lx = restX + (waveX - restX) * rise;
        ly = restY + (waveY - restY) * rise;
        rot = (-0.5 + Math.sin(13 * wt) * 0.35) * rise;
      } else if (sd < 0 && waving) {
        lx = restX;
        ly = restY + Math.sin(6 * (n - this.waveStart)) * 0.04 * bodyH;
      } else {
        lx = restX;
        ly = restY;
      }
      const c = Math.cos(this.p.tilt);
      const s = Math.sin(this.p.tilt);
      x.save();
      x.translate(cx + c * lx - s * ly, cy + s * lx + c * ly);
      if (rot) x.rotate(rot);
      x.beginPath(); x.ellipse(0, 0, hew, heh, 0, 0, Math.PI * 2);
      x.fillStyle = this.bodyFill(); x.fill();
      x.restore();
    }
  }

  private drawBadge(x: CanvasRenderingContext2D, badge: Badge, R: number, bx: number, by: number) {
    const bs = this.p.badgeS * (this.isMini ? 1.25 : 1);
    const t = now();
    x.save();
    x.translate(bx, by);
    x.scale(bs, bs);
    const col = rgba(badge.color);
    if (badge.kind === "dots" || badge.kind === "thought") {
      if (this.isMini || R < 16) {
        const ph = (t * 2.4) % 1;
        const dotR = R * 0.18 * (1 + 0.2 * Math.sin(ph * Math.PI * 2));
        x.fillStyle = "#000"; x.beginPath(); x.arc(0, 0, R * 0.22, 0, Math.PI * 2); x.fill();
        x.fillStyle = col; x.beginPath(); x.arc(0, 0, dotR, 0, Math.PI * 2); x.fill();
      } else {
        const pw = R * 0.72;
        const ph = R * 0.36;
        const ring = R * 0.07;
        // thought bubble: one small circle on the underside, toward the face, merged into the pill
        const tr = ph * 0.22;
        const tx = pw * 0.2;
        const ty = ph / 2 + tr * 0.35;
        const thought = badge.kind === "thought";
        // outlines first (both shapes), then fills, so the joint has no seam
        roundRectPath(x, -pw / 2 - ring, -ph / 2 - ring, pw + ring * 2, ph + ring * 2, ph / 2 + ring);
        x.fillStyle = "#000"; x.fill();
        if (thought) { x.beginPath(); x.arc(tx, ty, tr + ring, 0, Math.PI * 2); x.fill(); }
        roundRectPath(x, -pw / 2, -ph / 2, pw, ph, ph / 2);
        x.fillStyle = col; x.fill();
        if (thought) { x.beginPath(); x.arc(tx, ty, tr, 0, Math.PI * 2); x.fill(); }
        for (let i = 0; i < 3; i++) {
          const phase = (((t * 2.4 - i * 0.22) % 1) + 1) % 1;
          const dr = R * 0.055 * (1 + 0.4 * Math.max(0, Math.sin(phase * Math.PI * 2)));
          x.fillStyle = "#fff"; x.beginPath(); x.arc((i - 1) * R * 0.18, 0, dr, 0, Math.PI * 2); x.fill();
        }
      }
    } else if (badge.kind === "bang" || badge.kind === "question") {
      x.fillStyle = "#000"; x.beginPath(); x.arc(0, 0, R * 0.3, 0, Math.PI * 2); x.fill();
      x.fillStyle = col; x.beginPath(); x.arc(0, 0, R * 0.23, 0, Math.PI * 2); x.fill();
      if (!this.isMini && R >= 12) {
        x.fillStyle = "#fff";
        x.font = `900 ${R * 0.32}px ${FONT}`;
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.fillText(badge.kind === "bang" ? "!" : "?", 0, R * 0.02);
      }
    } else {
      x.fillStyle = "#000"; x.beginPath(); x.arc(0, 0, R * 0.2, 0, Math.PI * 2); x.fill();
      x.fillStyle = col; x.beginPath(); x.arc(0, 0, R * 0.135, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }
}

/** Point where a ray from the centre at angle (ca, sa) meets the superellipse |x/rx|^n + |y/ry|^n = 1. */
function squirclePoint(ca: number, sa: number, rx: number, ry: number, n: number) {
  const r = 1 / Math.pow(Math.pow(Math.abs(ca) / rx, n) + Math.pow(Math.abs(sa) / ry, n), 1 / n);
  return { x: ca * r, y: sa * r };
}
