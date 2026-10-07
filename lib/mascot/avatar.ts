/**
 * The avatar "recipe" stored in profiles.avatar (jsonb). Small, versioned, and
 * always passed through sanitizeAvatar() so bad/old data can never break rendering.
 */
import { ACCESSORIES, ACCESSORY_IDS, type AccessoryId } from "./catalog";
import { hashString } from "./core";
import { EYE_STYLE_IDS, type EyeStyleId } from "./eyes";
import { PALETTE_IDS, type PaletteId } from "./palettes";
import { SHAPE_IDS, type AccessorySlot, type ShapeId } from "./shapes";

import { CHEEK_STYLES, type CheekStyle } from "./avatar-types";
import { ACTIVE_CHEEKS, ACTIVE_EYE_STYLES, ACTIVE_SHAPES } from "./curation";
export { CHEEK_STYLES, type CheekStyle };

export const REACTIONS = ["dizzy", "burst"] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface AvatarConfig {
  v: 1;
  shape: ShapeId;
  palette: PaletteId;
  eyes: {
    style: EyeStyleId;
    /** 0.7 – 1 (1 = normal, the slider's maximum) */
    size: number;
    /** 0.85 – 1.1 (1 = normal, at 60% of the slider) */
    spacing: number;
  };
  cheeks: CheekStyle;
  /** Legacy: taps now alternate dizzy → burst for everyone; kept so saved JSON stays valid. */
  reaction: Reaction;
  accessories: Partial<Record<AccessorySlot, AccessoryId>>;
}

export const EYE_SIZE_RANGE = [0.7, 1] as const;
export const EYE_SPACING_RANGE = [0.85, 1.1] as const;

/**
 * Everyone gets a unique avatar on day one: a shape and colour picked from their id
 * (stable — the same person always gets the same default until they customise).
 * Existing members are backfilled with a random shape + colour by the migration.
 */
export function defaultAvatar(seed: string): AvatarConfig {
  const hash = hashString(seed) >>> 0;
  return {
    v: 1,
    shape: ACTIVE_SHAPES[hash % ACTIVE_SHAPES.length],
    palette: PALETTE_IDS[(hash >>> 8) % PALETTE_IDS.length],
    eyes: { style: "tall", size: 1, spacing: 1 },
    cheeks: "none",
    reaction: "dizzy",
    accessories: {},
  };
}

const pick = <T,>(list: readonly T[], r: number) => list[Math.floor(r * list.length) % list.length];

/** For "Shuffle" in the builder. Pass Math.random or a seeded RNG. */
export function randomAvatar(rng: () => number = Math.random): AvatarConfig {
  return {
    v: 1,
    shape: pick(ACTIVE_SHAPES, rng()),
    palette: pick(PALETTE_IDS, rng()),
    eyes: {
      style: pick(ACTIVE_EYE_STYLES, rng()),
      size: +(0.85 + rng() * 0.15).toFixed(2),
      spacing: +(0.9 + rng() * 0.2).toFixed(2),
    },
    cheeks: pick(ACTIVE_CHEEKS, rng()),
    reaction: "dizzy",
    accessories: {},
  };
}

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
const num = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/**
 * Accepts anything (DB json, form input) and returns a valid config.
 * `canWear` lets the server drop items the person hasn't unlocked.
 */
export function sanitizeAvatar(input: unknown, seed: string, canWear?: (id: AccessoryId) => boolean): AvatarConfig {
  const base = defaultAvatar(seed);
  if (!input || typeof input !== "object") return base;
  const o = input as Record<string, unknown>;
  const eyes = (o.eyes && typeof o.eyes === "object" ? o.eyes : {}) as Record<string, unknown>;
  const acc = (o.accessories && typeof o.accessories === "object" ? o.accessories : {}) as Record<string, unknown>;
  const accessories: AvatarConfig["accessories"] = {};
  for (const [slot, id] of Object.entries(acc)) {
    if (!isOneOf(ACCESSORY_IDS, id)) continue;
    if (ACCESSORIES[id].slot !== slot) continue;
    if (canWear && !canWear(id)) continue;
    accessories[slot as AccessorySlot] = id;
  }
  // A skin is the whole look: it never combines with gear.
  if (accessories.body) for (const s of Object.keys(accessories) as AccessorySlot[]) if (s !== "body") delete accessories[s];
  return {
    v: 1,
    // set-aside ids are still accepted so older saved avatars keep rendering
    shape: isOneOf(SHAPE_IDS, o.shape) ? o.shape : base.shape,
    palette: isOneOf(PALETTE_IDS, o.palette) ? o.palette : base.palette,
    eyes: {
      style: isOneOf(EYE_STYLE_IDS, eyes.style) ? eyes.style : base.eyes.style,
      size: num(eyes.size, EYE_SIZE_RANGE[0], EYE_SIZE_RANGE[1], 1),
      spacing: num(eyes.spacing, EYE_SPACING_RANGE[0], EYE_SPACING_RANGE[1], 1),
    },
    cheeks: isOneOf(CHEEK_STYLES, o.cheeks) ? o.cheeks : base.cheeks,
    reaction: isOneOf(REACTIONS, o.reaction) ? o.reaction : base.reaction,
    accessories,
  };
}

/**
 * Put an item on (or take a slot off with `id = null`), keeping skins exclusive:
 * a body skin removes all gear, and any gear removes the skin.
 */
export function equipAccessory(a: AvatarConfig, slot: AccessorySlot, id: AccessoryId | null): AvatarConfig {
  const accessories: AvatarConfig["accessories"] = slot === "body" ? {} : { ...a.accessories };
  if (slot !== "body") delete accessories.body;
  if (id) accessories[slot] = id; else delete accessories[slot];
  return { ...a, accessories };
}

/** Stable key for caching static renders. */
export function avatarKey(a: AvatarConfig) {
  const acc = Object.entries(a.accessories).sort().map(([s, i]) => `${s}:${i}`).join(",");
  return `${a.shape}|${a.palette}|${a.eyes.style}|${a.eyes.size}|${a.eyes.spacing}|${a.cheeks}|${acc}`;
}
