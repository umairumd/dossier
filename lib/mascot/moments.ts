/**
 * The single source of truth for *when* the mascot does *what*.
 *
 * Tiers (curation rules):
 *   ambient — always on, subtle (blink, gaze, breathing). Only on your own live avatar.
 *   state   — persistent, reflects reality (report due, writing, submitted, day off…).
 *   moment  — one-shot reactions. Rate-limited (see MOMENT_COOLDOWN_MS).
 *
 * status:
 *   live     — wire it now.
 *   reserved — designed & playable in /dev/mascot, but not wired yet (future features).
 *
 * App code never calls engine methods directly; it fires a moment id:
 *   mascotBus.emit("report.submitted")
 */
import type { MascotEngine } from "./engine";

export type MomentTier = "ambient" | "state" | "moment";
export type MomentStatus = "live" | "reserved";

export interface MomentDef {
  id: string;
  title: string;
  tier: MomentTier;
  status: MomentStatus;
  /** Where in Dossier this happens. */
  where: string;
  /** What triggers it. */
  trigger: string;
  /** Moment-tier ids are rate-limited (MOMENT_COOLDOWN_MS). Pointer-driven ones opt out. */
  cooldown?: false;
  play(e: MascotEngine, after: (ms: number, fn: () => void) => void): void;
}

const def = (m: MomentDef) => m;

export const MOMENTS = {
  // ── Session ──────────────────────────────────────────────────────────────
  "auth.login": def({
    id: "auth.login", title: "Hi! (login)", tier: "moment", status: "live",
    where: "Dashboard hero", trigger: "First dashboard render after sign-in (once per session)",
    play: (e) => e.greet(),
  }),
  "idle.doze": def({
    id: "idle.doze", title: "Dozes off", tier: "ambient", status: "live",
    where: "Dashboard hero", trigger: "No input for 8 min (runtime sleepAfterMs)",
    play: (e) => e.doze(),
  }),
  "idle.wake": def({
    id: "idle.wake", title: "Wakes up", tier: "ambient", status: "live",
    where: "Dashboard hero", trigger: "Any input after dozing (automatic)",
    play: (e) => e.wake(),
  }),
  "cursor.notice": def({
    id: "cursor.notice", title: "Notices you", tier: "ambient", status: "live",
    where: "Any live avatar", trigger: "Pointer enters the follow region after 3 s away (automatic)",
    play: (e) => e.notice(),
  }),

  // ── Reports ──────────────────────────────────────────────────────────────
  "report.calm": def({
    id: "report.calm", title: "Calm (deadline not close yet)", tier: "state", status: "live",
    where: "Hero", trigger: "Working day, no report yet, more than 1 hour before the deadline",
    play: (e) => e.setState("idle"),
  }),
  "report.due": def({
    id: "report.due", title: "Report due", tier: "state", status: "live",
    where: "Hero", trigger: "Working day, no report yet, last hour before the deadline",
    play: (e) => e.setState("approval"),
  }),
  "report.overdue": def({
    id: "report.overdue", title: "Past the deadline (tired)", tier: "state", status: "live",
    where: "Hero", trigger: "Working day, deadline passed, still no report",
    play: (e) => e.setState("ratelimit"),
  }),
  "report.writing": def({
    id: "report.writing", title: "Writing", tier: "state", status: "live",
    where: "Hero", trigger: "Submit sheet open",
    play: (e) => e.setState("working"),
  }),
  "report.dropHover": def({
    id: "report.dropHover", cooldown: false, title: "Opens up (hover Submit)", tier: "moment", status: "live",
    where: "Hero / submit sheet", trigger: "Pointer enters the Submit button",
    play: (e) => e.setDropMode(1),
  }),
  "report.dropReady": def({
    id: "report.dropReady", cooldown: false, title: "Mouth wide (pressing Submit)", tier: "moment", status: "live",
    where: "Hero / submit sheet", trigger: "pointerdown on Submit",
    play: (e) => e.setDropMode(2),
  }),
  "report.dropCancel": def({
    id: "report.dropCancel", cooldown: false, title: "Closes again", tier: "moment", status: "live",
    where: "Hero / submit sheet", trigger: "Pointer leaves Submit without submitting",
    play: (e) => e.setDropMode(0),
  }),
  "report.submitted": def({
    id: "report.submitted", title: "Eats the report", tier: "moment", status: "live",
    where: "Hero", trigger: "submitReport() succeeded, on time",
    // original upload sequence: swallow → chew (content eyes) → round again → small success hop,
    // then a short happy dance (~3 s)
    play: (e, after) => e.swallow(() => {
      e.setState("finished", false, true);
      e.hop();
      after(450, () => e.setDancing(true));
      after(3500, () => e.setDancing(false));
    }),
  }),
  "report.submittedLate": def({
    id: "report.submittedLate", title: "Eats it, a bit tired", tier: "moment", status: "live",
    where: "Hero", trigger: "submitReport() succeeded after the deadline",
    play: (e) => e.swallow(() => e.setState("ratelimit", false, true)),
  }),
  "report.done": def({
    id: "report.done", title: "Done for today", tier: "state", status: "live",
    where: "Hero", trigger: "Report exists for today",
    play: (e) => e.setState("finished", false, true),
  }),

  // ── Off days ─────────────────────────────────────────────────────────────
  "day.off": def({
    id: "day.off", title: "Day off", tier: "state", status: "live",
    where: "Hero (with the amber Day off pill)", trigger: "Non-working day or holiday",
    play: (e) => e.setState("sleeping"),
  }),
  "day.offSubmit": def({
    id: "day.offSubmit", title: "Working on a day off", tier: "moment", status: "live",
    where: "Hero", trigger: "“Submit anyway” clicked",
    play: (e, after) => { e.setState("idle"); e.triggerEmote("yawn"); after(1600, () => e.setState("working")); },
  }),

  // ── Notifications ────────────────────────────────────────────────────────
  "notification.new": def({
    id: "notification.new", title: "Ping", tier: "moment", status: "live",
    where: "Hero / user menu avatar", trigger: "Realtime notification insert",
    play: (e) => e.ping(),
  }),
  "comment.received": def({
    id: "comment.received", title: "Someone commented", tier: "moment", status: "live",
    where: "Hero", trigger: "report_commented notification",
    play: (e, after) => { e.ping(); after(350, () => e.triggerEmote("surprised")); },
  }),
  "leave.approved": def({
    id: "leave.approved", title: "Leave approved", tier: "moment", status: "live",
    where: "Hero", trigger: "leave_approved notification",
    play: (e, after) => { e.triggerEmote("happy"); after(800, () => e.triggerEmote("wink")); },
  }),
  "leave.rejected": def({
    id: "leave.rejected", title: "Leave declined", tier: "moment", status: "live",
    where: "Hero", trigger: "leave_rejected notification",
    play: (e) => e.triggerEmote("sad", 2.2),
  }),

  // ── Celebrations ─────────────────────────────────────────────────────────
  "birthday.self": def({
    id: "birthday.self", title: "Your birthday", tier: "moment", status: "live",
    where: "Hero", trigger: "First visit on your birthday (org timezone)",
    play: (e, after) => {
      e.wear("partyHat", 24 * 3600 * 1000);
      after(450, () => { e.triggerEmote("love", 2.4); e.celebrate(0.8); });
      after(900, () => e.setDancing(true));
      after(5200, () => e.setDancing(false));
    },
  }),
  "birthday.teammate": def({
    id: "birthday.teammate", title: "Teammate's birthday", tier: "state", status: "live",
    where: "Birthdays page, Team Today panel", trigger: "That person's birthday",
    play: (e) => { e.wear("partyHat", 24 * 3600 * 1000); e.setPermanentEmote("happy"); },
  }),
  "team.complete": def({
    id: "team.complete", title: "100% team today", tier: "moment", status: "live",
    where: "Manager / admin hero", trigger: "Last missing report arrives",
    play: (e, after) => {
      e.wear("crown", 6000);
      e.setState("finished");
      after(1300, () => { e.celebrate(1); e.setDancing(true); e.triggerEmote("proud", 2.5); });
      after(5200, () => e.setDancing(false));
    },
  }),
  "streak.milestone": def({
    id: "streak.milestone", title: "Streak milestone", tier: "moment", status: "live",
    where: "Hero", trigger: "Streak hits 5 / 10 / 30",
    play: (e, after) => { e.triggerEmote("proud"); after(300, () => e.emit("spark", 6)); },
  }),
  "reward.unlocked": def({
    id: "reward.unlocked", title: "New item unlocked", tier: "moment", status: "live",
    where: "Hero + wardrobe toast", trigger: "evaluateUnlocks() returned items",
    play: (e, after) => { e.triggerEmote("surprised"); after(500, () => e.celebrate(0.5)); },
  }),

  // ── Loading / errors ─────────────────────────────────────────────────────
  "data.loading": def({
    id: "data.loading", title: "Looking for it", tier: "state", status: "live",
    where: "Empty/loading states", trigger: "Suspense fallback / fetch pending",
    play: (e) => e.setState("searching"),
  }),
  "insights.thinking": def({
    id: "insights.thinking", title: "Thinking", tier: "state", status: "live",
    where: "Analytics", trigger: "Trend computation",
    play: (e) => e.setState("thinking"),
  }),
  "save.error": def({
    id: "save.error", title: "Couldn't save", tier: "moment", status: "live",
    where: "Hero / forms", trigger: "Server action returned an error",
    play: (e, after) => { e.setState("error"); after(2400, () => e.setState("idle")); },
  }),

  // ── Play ─────────────────────────────────────────────────────────────────
  "poke": def({
    id: "poke", title: "Poke (annoyance ladder)", tier: "moment", status: "live",
    where: "Your own avatar in the hero", trigger: "Click / tap on the body",
    play: (e) => e.poke(),
  }),

  // ── Reserved for future features ─────────────────────────────────────────
  "island.expand": def({
    id: "island.expand", title: "Dynamic island opens", tier: "moment", status: "reserved",
    where: "Future dynamic-island hero", trigger: "Tap the island",
    play: (e) => { e.blink(); e.squash(0.6); },
  }),
  "mood.week": def({
    id: "mood.week", title: "Weekly mood", tier: "state", status: "reserved",
    where: "Profile", trigger: "Weekly completion rate (happy ≥ 90%, tired < 60%)",
    play: (e) => e.setPermanentEmote("happy"),
  }),
  "music.dance": def({
    id: "music.dance", title: "Dance party", tier: "moment", status: "reserved",
    where: "Friday 5 pm / team events", trigger: "Org event",
    play: (e, after) => { e.setDancing(true); after(8000, () => e.setDancing(false)); },
  }),
  "team.wave": def({
    id: "team.wave", title: "Teammates wave back", tier: "moment", status: "reserved",
    where: "Team Today panel", trigger: "You greet the team",
    play: (e) => e.greet(),
  }),
  "explode.manual": def({
    id: "explode.manual", title: "Boom (manual)", tier: "moment", status: "reserved",
    where: "Easter egg / admin fun", trigger: "Konami code?",
    play: (e) => e.explode(),
  }),
  "roll.flip": def({
    id: "roll.flip", title: "Front flip", tier: "moment", status: "reserved",
    where: "Level-up moments", trigger: "Big milestone",
    play: (e) => e.doRoll(950, 1),
  }),
} satisfies Record<string, MomentDef>;

export type MomentId = keyof typeof MOMENTS;

/** Same moment won't replay within this window (per avatar). States are exempt. */
export const MOMENT_COOLDOWN_MS = 4000;
