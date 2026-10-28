/**
 * Accessory catalogue + reward/unlock rules. Pure data and pure functions, so it
 * runs on the server (granting unlocks, validating saves) and the client (wardrobe UI).
 */
import type { AccessorySlot } from "./shapes";

export const ACCESSORY_IDS = [
  "roundGlasses", "sunglasses", "bow", "flower", "scarf", "bowtie",
  "sprout", "beanie", "headphones", "partyHat", "crown", "gradCap", "halo",
  "santaHat", "witchHat", "nightWitchHat", "pumpkin",
  "panda", "frog", "strawberry", "cow", "watermelon", "tiger", "snowman",
] as const;
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

export type Rarity = "starter" | "common" | "rare" | "epic" | "legendary" | "seasonal" | "special" | "awarded";

export type UnlockRule =
  | { kind: "starter" }
  | { kind: "firstReport" }
  | { kind: "streak"; days: number }
  /** Consecutive working days with an on-time report (days off/holidays/leave skipped). */
  | { kind: "onTimeStreak"; days: number }
  | { kind: "onTimeReports"; count: number }
  | { kind: "totalReports"; count: number }
  | { kind: "perfectWeeks"; count: number }
  | { kind: "perfectMonths"; count: number }
  | { kind: "tenureDays"; days: number }
  | { kind: "birthday" }
  | { kind: "teamCompleteDays"; days: number }
  /** Wearable only inside the window (MM-DD, inclusive, wraps across new year). */
  | { kind: "season"; from: string; to: string }
  /** Given by an owner or admin (Award an item); never earned from stats. */
  | { kind: "grant" };

export interface AccessoryDef {
  id: AccessoryId;
  label: string;
  slot: AccessorySlot;
  rarity: Rarity;
  /** Any rule unlocks it (OR). */
  unlock: UnlockRule[];
  /** Shown in the wardrobe. */
  hint: string;
}

export const ACCESSORIES: Record<AccessoryId, AccessoryDef> = {
  roundGlasses: { id: "roundGlasses", label: "Reading glasses", slot: "face", rarity: "starter", unlock: [{ kind: "starter" }], hint: "Yours from day one." },
  bow: { id: "bow", label: "Bow", slot: "head", rarity: "starter", unlock: [{ kind: "starter" }], hint: "Yours from day one." },
  flower: { id: "flower", label: "Daisy", slot: "head", rarity: "starter", unlock: [{ kind: "starter" }], hint: "Yours from day one." },
  scarf: { id: "scarf", label: "Scarf", slot: "neck", rarity: "starter", unlock: [{ kind: "starter" }], hint: "Yours from day one." },
  sprout: { id: "sprout", label: "Sprout", slot: "head", rarity: "common", unlock: [{ kind: "firstReport" }], hint: "Submit your first report." },
  beanie: { id: "beanie", label: "Beanie", slot: "head", rarity: "common", unlock: [{ kind: "streak", days: 5 }], hint: "Reach a 5-day streak." },
  sunglasses: { id: "sunglasses", label: "Shades", slot: "face", rarity: "rare", unlock: [{ kind: "streak", days: 10 }], hint: "Reach a 10-day streak." },
  headphones: { id: "headphones", label: "Focus headphones", slot: "head", rarity: "rare", unlock: [{ kind: "onTimeReports", count: 25 }], hint: "25 reports on time." },
  bowtie: { id: "bowtie", label: "Bowtie", slot: "neck", rarity: "rare", unlock: [{ kind: "totalReports", count: 50 }], hint: "50 reports submitted." },
  partyHat: { id: "partyHat", label: "Party hat", slot: "head", rarity: "special", unlock: [{ kind: "birthday" }], hint: "Worn automatically on your birthday — keep it after." },
  crown: { id: "crown", label: "Crown", slot: "head", rarity: "epic", unlock: [{ kind: "streak", days: 25 }, { kind: "teamCompleteDays", days: 10 }], hint: "25-day streak — or lead your team to 100% on 10 days." },
  gradCap: { id: "gradCap", label: "Graduation cap", slot: "head", rarity: "epic", unlock: [{ kind: "tenureDays", days: 365 }], hint: "One year at the company." },
  halo: { id: "halo", label: "Halo", slot: "head", rarity: "legendary", unlock: [{ kind: "onTimeStreak", days: 30 }], hint: "30 working days in a row, every report on time." },
  santaHat: { id: "santaHat", label: "Santa hat", slot: "head", rarity: "seasonal", unlock: [{ kind: "season", from: "12-01", to: "12-31" }], hint: "Available in December." },
  witchHat: { id: "witchHat", label: "Witch hat", slot: "head", rarity: "seasonal", unlock: [{ kind: "season", from: "10-20", to: "11-02" }], hint: "Available around Halloween." },
  nightWitchHat: { id: "nightWitchHat", label: "Night witch hat", slot: "head", rarity: "awarded", unlock: [{ kind: "grant" }], hint: "Awarded by the team, not earned." },
  pumpkin: { id: "pumpkin", label: "Pumpkin", slot: "body", rarity: "seasonal", unlock: [{ kind: "season", from: "10-20", to: "11-02" }], hint: "Available around Halloween." },
  panda: { id: "panda", label: "Panda", slot: "body", rarity: "starter", unlock: [{ kind: "starter" }], hint: "Yours from day one." },
  frog: { id: "frog", label: "Frog", slot: "body", rarity: "starter", unlock: [{ kind: "starter" }], hint: "Yours from day one." },
  strawberry: { id: "strawberry", label: "Strawberry", slot: "body", rarity: "common", unlock: [{ kind: "onTimeReports", count: 10 }], hint: "10 reports on time." },
  cow: { id: "cow", label: "Cow", slot: "body", rarity: "rare", unlock: [{ kind: "perfectWeeks", count: 4 }], hint: "4 perfect weeks: every working day on time." },
  watermelon: { id: "watermelon", label: "Watermelon", slot: "body", rarity: "rare", unlock: [{ kind: "totalReports", count: 100 }], hint: "100 reports submitted." },
  tiger: { id: "tiger", label: "Tiger", slot: "body", rarity: "epic", unlock: [{ kind: "streak", days: 60 }], hint: "Reach a 60-day streak." },
  snowman: { id: "snowman", label: "Snowman", slot: "body", rarity: "seasonal", unlock: [{ kind: "season", from: "12-01", to: "01-31" }], hint: "Available Dec 1 – Jan 31." },
};

export const RARITY_STYLE: Record<Rarity, { label: string; color: string }> = {
  starter: { label: "Starter", color: "#9CA3AF" },
  common: { label: "Common", color: "#34D399" },
  rare: { label: "Rare", color: "#60A5FA" },
  epic: { label: "Epic", color: "#A78BFA" },
  legendary: { label: "Legendary", color: "#FBBF24" },
  seasonal: { label: "Seasonal", color: "#F97316" },
  special: { label: "Special", color: "#F472B6" },
  awarded: { label: "Awarded", color: "#35C7B8" },
};

/** Items owners and admins can award (unlock rule "grant"). */
export const GRANTABLE_IDS: AccessoryId[] = ACCESSORY_IDS.filter((id) =>
  ACCESSORIES[id].unlock.some((rule) => rule.kind === "grant"),
);

/** Stats the server already computes (reports, streaks, tenure…). */
export interface RewardStats {
  totalReports: number;
  onTimeReports: number;
  currentStreak: number;
  longestStreak: number;
  /** Consecutive on-time working days (current run). */
  onTimeStreak: number;
  longestOnTimeStreak: number;
  perfectWeeks: number;
  perfectMonths: number;
  tenureDays: number;
  isBirthdayToday: boolean;
  /** Managers only; 0 otherwise. */
  teamCompleteDays: number;
}

function mmdd(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, month: "2-digit", day: "2-digit" }).formatToParts(date);
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${m}-${d}`;
}

export function inSeason(rule: { from: string; to: string }, date: Date, timeZone = "UTC") {
  const t = mmdd(date, timeZone);
  return rule.from <= rule.to ? t >= rule.from && t <= rule.to : t >= rule.from || t <= rule.to;
}

function ruleMet(rule: UnlockRule, s: RewardStats): boolean {
  switch (rule.kind) {
    case "starter": return true;
    case "firstReport": return s.totalReports >= 1;
    case "streak": return Math.max(s.currentStreak, s.longestStreak) >= rule.days;
    case "onTimeStreak": return Math.max(s.onTimeStreak ?? 0, s.longestOnTimeStreak ?? 0) >= rule.days;
    case "onTimeReports": return s.onTimeReports >= rule.count;
    case "totalReports": return s.totalReports >= rule.count;
    case "perfectWeeks": return s.perfectWeeks >= rule.count;
    case "perfectMonths": return s.perfectMonths >= rule.count;
    case "tenureDays": return s.tenureDays >= rule.days;
    case "birthday": return s.isBirthdayToday;
    case "teamCompleteDays": return s.teamCompleteDays >= rule.days;
    case "season": return false; // seasonal items are never "owned" — see isWearable
    case "grant": return false;
  }
}

/** Item ids newly earned by `stats` that aren't in `owned`. Persist these, then play `reward.unlocked`. */
export function evaluateUnlocks(stats: RewardStats, owned: ReadonlySet<string>): AccessoryId[] {
  return ACCESSORY_IDS.filter((id) => !owned.has(id) && ACCESSORIES[id].unlock.some((r) => ruleMet(r, stats)));
}

/** Can this item be equipped right now? (owned, or a seasonal item in season) */
export function isWearable(id: AccessoryId, owned: ReadonlySet<string>, date = new Date(), timeZone = "UTC") {
  const def = ACCESSORIES[id];
  if (def.unlock.some((r) => r.kind === "starter")) return true;
  if (owned.has(id)) return true;
  return def.unlock.some((r) => r.kind === "season" && inSeason(r, date, timeZone));
}

/** Progress for the wardrobe's progress bars (closest rule wins). */
export function unlockProgress(id: AccessoryId, s: RewardStats): { current: number; target: number } | null {
  let best: { current: number; target: number } | null = null;
  for (const r of ACCESSORIES[id].unlock) {
    let p: { current: number; target: number } | null = null;
    switch (r.kind) {
      case "firstReport": p = { current: Math.min(s.totalReports, 1), target: 1 }; break;
      // Streak bars show the run you're on now (they reset when it breaks); unlocking still counts your best run.
      case "streak": p = { current: s.currentStreak, target: r.days }; break;
      case "onTimeStreak": p = { current: s.onTimeStreak ?? 0, target: r.days }; break;
      case "onTimeReports": p = { current: s.onTimeReports, target: r.count }; break;
      case "totalReports": p = { current: s.totalReports, target: r.count }; break;
      case "perfectWeeks": p = { current: s.perfectWeeks, target: r.count }; break;
      case "perfectMonths": p = { current: s.perfectMonths, target: r.count }; break;
      case "tenureDays": p = { current: s.tenureDays, target: r.days }; break;
      case "teamCompleteDays": p = s.teamCompleteDays > 0 ? { current: s.teamCompleteDays, target: r.days } : null; break;
      default: p = null;
    }
    if (p && (!best || p.current / p.target > best.current / best.target)) best = p;
  }
  return best;
}
