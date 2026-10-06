/**
 * Idle life. Every person gets a *personality* (derived from their user id, so it's stable
 * and needs no storage) that decides which small idle actions their buddy does, how often,
 * and how its eyes wander. Put eight people in a row and no two move in sync.
 *
 *   gaze  — glances, look-arounds, pondering, peeking down        (only while not following the cursor)
 *   eyes  — slow blink, double blink, happy squint, sleepy lids, curious wide eyes, wink
 *   body  — sway, tiny hop, wiggle, nod, stretch
 *   combo — hum (happy + sway), curious (tilt + wide + glance), ponder (look up + flat + tilt), shy blush
 */
import { hashString } from "./core";

export const IDLE_ACTION_IDS = [
  "glance", "lookAround", "ponder", "peekDown",
  "slowBlink", "doubleBlink", "squint", "sleepyLids", "curious", "wink",
  "sway", "hop", "wiggle", "nod", "stretch",
  "hum", "shyBlush", "yawn",
] as const;
export type IdleAction = (typeof IDLE_ACTION_IDS)[number];

export const IDLE_ACTION_GROUP: Record<IdleAction, "gaze" | "eyes" | "body" | "combo"> = {
  glance: "gaze", lookAround: "gaze", ponder: "combo", peekDown: "gaze",
  slowBlink: "eyes", doubleBlink: "eyes", squint: "eyes", sleepyLids: "eyes", curious: "combo", wink: "eyes",
  sway: "body", hop: "body", wiggle: "body", nod: "body", stretch: "body",
  hum: "combo", shyBlush: "combo", yawn: "combo",
};

export interface Personality {
  id: PersonalityId;
  label: string;
  blurb: string;
  /** Seconds between idle actions [min, max]. */
  every: [number, number];
  /** Relative weights; actions not listed never happen for this personality. */
  weights: Partial<Record<IdleAction, number>>;
  /** Eye wander while the cursor is away: horizontal range, vertical range, vertical bias (+ = down), hold seconds. */
  wander: { x: number; y: number; bias: number; hold: [number, number] };
}

export const PERSONALITY_IDS = ["curious", "calm", "bubbly", "sleepy", "shy", "focused"] as const;
export type PersonalityId = (typeof PERSONALITY_IDS)[number];

export const PERSONALITIES: Record<PersonalityId, Personality> = {
  curious: {
    id: "curious", label: "Curious", blurb: "Always looking around, tilts its head at things.",
    every: [2.8, 5.5],
    weights: { glance: 3, lookAround: 3, curious: 3, ponder: 1, doubleBlink: 2, hop: 1, nod: 1 },
    wander: { x: 0.95, y: 0.6, bias: -0.05, hold: [0.9, 2.2] },
  },
  calm: {
    id: "calm", label: "Calm", blurb: "Slow blinks, gentle sway, rarely in a hurry.",
    every: [6, 11],
    weights: { slowBlink: 3, sway: 3, ponder: 1, glance: 1, hum: 1, stretch: 1 },
    wander: { x: 0.45, y: 0.3, bias: 0.05, hold: [2.5, 4.5] },
  },
  bubbly: {
    id: "bubbly", label: "Bubbly", blurb: "Little hops, wiggles and happy squints.",
    every: [2.6, 5],
    weights: { hop: 3, wiggle: 3, squint: 3, hum: 2, wink: 1, glance: 1 },
    wander: { x: 0.8, y: 0.5, bias: -0.1, hold: [1, 2.4] },
  },
  sleepy: {
    id: "sleepy", label: "Sleepy", blurb: "Heavy lids, slow blinks, the odd yawn.",
    every: [5, 10],
    weights: { sleepyLids: 3, slowBlink: 3, yawn: 1, peekDown: 2, sway: 1 },
    wander: { x: 0.4, y: 0.35, bias: 0.25, hold: [2.5, 5] },
  },
  shy: {
    id: "shy", label: "Shy", blurb: "Looks down and away, blushes, peeks back.",
    every: [4, 8],
    weights: { peekDown: 3, shyBlush: 2, glance: 2, doubleBlink: 2, squint: 1 },
    wander: { x: 0.6, y: 0.4, bias: 0.3, hold: [1.4, 3] },
  },
  focused: {
    id: "focused", label: "Focused", blurb: "Reads, thinks, nods along.",
    every: [5, 9],
    weights: { nod: 2, ponder: 3, lookAround: 2, doubleBlink: 1, stretch: 1 },
    wander: { x: 0.7, y: 0.2, bias: 0.15, hold: [1.6, 3.2] },
  },
};

/** Stable personality for a person (same id → same temperament everywhere). */
export function personalityFor(seed: string): PersonalityId {
  return PERSONALITY_IDS[(hashString(seed + "·idle") >>> 3) % PERSONALITY_IDS.length];
}

export function pickIdleAction(p: Personality, canGaze: boolean, last: IdleAction | null, rnd = Math.random): IdleAction | null {
  const opts = (Object.entries(p.weights) as [IdleAction, number][])
    .filter(([id]) => id !== last && (canGaze || IDLE_ACTION_GROUP[id] !== "gaze"));
  const total = opts.reduce((s, [, w]) => s + w, 0);
  if (!total) return null;
  let r = rnd() * total;
  for (const [id, w] of opts) { r -= w; if (r <= 0) return id; }
  return opts[opts.length - 1][0];
}
