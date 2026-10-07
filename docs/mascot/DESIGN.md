# Dossier Buddy — design & launch spec

Every person in Dossier has a small character ("buddy") that is theirs, and the app
speaks through it. The rule that keeps it premium: **motion only where it carries
meaning**. Most places show a still face; your own buddy is alive; big moments are rare.

Visual style: **flat**. One solid colour per body, solid accessory colours, no gradients,
no glossy highlights, no outlines. Effects animate by scale, not by fading.

---

## Round 2 updates (these supersede the sections below where they differ)

| Area | Change |
|---|---|
| Poke reaction | No setting any more. Taps **alternate** for everyone: the first annoyance episode ends **dizzy** (3 quick taps), the next builds to the **burst** (10 taps), then dizzy again. `avatar.reaction` stays in saved JSON for compatibility and is ignored. |
| Eye spacing | Range is now **0.85 – 1.10** (old midpoint is the new max). Saved values above 1.10 are clamped by `sanitizeAvatar`. |
| Glow | Soft, wide ambient glow behind the live buddy in its body colour; shifts to the state colour (amber when due, red on error, green when done). Engine option `glow`; `<Mascot glow>`. Live buddies only (hero + builder preview). |
| Late night | 10 pm – 5 am **org time**: heavy lids, yawns, nodding off; dozes after 1 min without input. `isLateNight(date, tz)` + `<Mascot lateNight>`. |
| After submit | `report.submitted` now ends with a ~3 s happy dance (engine moment, no app work). |
| "!" badge | Only in the **last hour** before the deadline. Before that the hero buddy is calm (`idle`); after the deadline without a report it looks tired (`ratelimit`), never alarmed. |
| Wave | Plays on every new sign-in **and** on the first dashboard visit of each org day. |
| Hover feed | Hovering the hero's own **Submit** button opens the buddy up (drop box), same as the sheet's button. |
| Customise | Settings → Profile gets **Customise buddy**, which opens a **dialog** with the whole builder + wardrobe. Deep link `/settings?buddy=open` (also used by the dashboard nudge and by `?wear=<id>`). |
| Halo | Unlocks after **30 consecutive on-time working days** (`onTimeStreak`), so the bar fills day by day. |
| Skins | New: **Panda** and **Frog** (free starters), **Watermelon** (100 reports), **Snowman** (seasonal Dec 1 – Jan 31). Cow, Tiger and Strawberry are built but set aside. Pumpkin stripes now sit under the eyes. |
| Deadline moments | New state moments `report.calm` (→ idle) and `report.overdue` (→ tired) sit beside `report.due` in `moments.ts`. |

## 1. Look (all free, never gated)

Stored in `profiles.avatar` (jsonb, ~200 bytes). `null` = default from the user id.

| Part | Ships at launch | Set aside (still renders, not offered) |
|---|---|---|
| Shape | Orb, Soft, Pebble, Onigiri, Bean, Drop, Cube, Gem, Blob (optically equal size) | — |
| Colour | 12 palettes (flat `mid` colour) | — |
| Eye style | Pill, Round, Tall, Oval, Sleepy | Classic, Sparkle, Dot |
| Eye size / spacing | sliders: size 0.7–1 (1 = normal, slider max); spacing 0.85–1.35 (1 = normal, ~30%) | — |
| Cheeks | None, Rosy, Freckles (cheeks follow the gaze) | Soft |
| When poked (`reaction`) | "Gets dizzy" (default) or "Bursts" | — |
| Accessories | 4 slots: head, face, neck, body (skin); one item per slot | — |
| Idle personality | automatic from the user id | picker |

**Everyone is a buddy.** Dossier has no profile photos; `profiles.avatar_url` is not shown anywhere
(the column stays for now, unused). Every avatar in the app renders the person's buddy.

**Defaults.** New people: `defaultAvatar(userId)` picks a stable shape + colour from the id,
Tall eyes, no cheeks, Dizzy, no accessories. Existing members are **backfilled once with a
random shape + colour** by the migration (only rows where `avatar is null`).

The set-aside lists live in `lib/mascot/curation.ts` (`SET_ASIDE`); launch switches in `LAUNCH`.

## 2. Eyes: style vs expression

- **Style** belongs to the person (proportions, spacing, tilt).
- **Expression** belongs to the moment (happy, heart, line, spiral…), drawn with the
  person's own style metrics — no animation is exclusive to a style.
- Hats never cover the eyes: each head item reports its brim line and the gaze stops
  just below it (`OutfitDef.brimY`).

## 3. Motion tiers

| Tier | What | Where |
|---|---|---|
| Live | animated, eyes follow the cursor inside a region, taps, every moment, dozes after 8 min | Dashboard hero (your own buddy), avatar builder preview |
| Ambient | animated at small size, idle personality only, no cursor/taps, pauses off-screen | Team Today panel (manager/admin), Birthdays page — max 12 live per screen, rest static |
| Static | one cached image | every other avatar: tables, lists, comments, menus, notifications |

Touch devices: no cursor, so live buddies wander. `prefers-reduced-motion`: no spins,
shakes, hops or pops.

## 4. Idle personalities

Derived from the user id (`personalityFor(id)`), so a team row never moves in sync.

| Personality | Feel | Pace |
|---|---|---|
| Curious | glances, looks around, tilts its head | every 3–5.5 s |
| Calm | slow blinks, gentle sway | every 6–11 s |
| Bubbly | hops, wiggles, happy squints, hums | every 2.6–5 s |
| Sleepy | heavy lids, slow blinks, the odd yawn, looks down | every 5–10 s |
| Shy | looks down and away, blushes, peeks back | every 4–8 s |
| Focused | ponders, nods, scans | every 5–9 s |

18 actions in 4 groups (gaze / eyes / body / combo). Gaze actions only run while the
cursor isn't being followed. Nothing idles while busy, angry, dozing or with reduced motion.

## 5. When poked (your own buddy only)

| Reaction | Behaviour |
|---|---|
| **Gets dizzy** (default, the original) | each tap squashes and knocks it, line eyes for 0.8 s; 3 taps within 1.7 s → spins twice with spiral eyes and a wobbly gaze for 3.3 s, then shakes it off |
| **Bursts** | line eyes (no angry brows), every tap flashes red; 3+ taps → red flashing on a beat that speeds up; 10 taps → inflates while strobing red → flat pop (white shock ring, comic pop lines, goo blobs in its own colour, its two eyes tumbling out) → drops back in dizzy, then shy. 20 s cooldown before it can burst again. No smoke. |

Anger never comes from app events — only from poking.

## 6. Drop box (report submission)

| Event | Buddy |
|---|---|
| Hover Submit | morphs into a box (squircle), mouth ajar, looks at the button |
| Press Submit | mouth wide open |
| Submit succeeds | swallows, chews, rounds back, small hop → "finished" (no star eyes, no floating stars) |
| Submitted late | same, then tired |
| Leave without submitting | closes, back to normal |

## 7. Moments wired at launch

| Moment id | What | Where | Trigger |
|---|---|---|---|
| `auth.login` | Hi + wave | Dashboard hero | first dashboard load after sign-in, once per session |
| `idle.doze` / `idle.wake` | dozes / wakes | Dashboard hero | 8 min without input / any input (automatic) |
| `cursor.notice` | notices you | live buddies | cursor returns after 3 s away (automatic) |
| `report.due` | due (state) | Dashboard hero | working day, no report yet |
| `report.writing` | writing (state) | Dashboard hero | submit sheet open |
| `report.dropHover` / `dropReady` / `dropCancel` | drop box | hero / submit sheet | hover / press / leave Submit |
| `report.submitted` | eats the report | Dashboard hero | submit succeeded on time |
| `report.submittedLate` | eats it, a bit tired | Dashboard hero | submit succeeded after the deadline |
| `report.done` | done for today (state) | Dashboard hero | today's report exists |
| `day.off` | day off (state) | Dashboard hero, beside the Day off pill | non-working day or holiday |
| `day.offSubmit` | working on a day off | Dashboard hero | "Submit anyway" |
| `notification.new` | ping | hero, user-menu avatar | realtime notification |
| `comment.received` | someone commented | Dashboard hero | `report_commented` notification |
| `leave.approved` / `leave.rejected` | leave decision | Dashboard hero | leave notifications |
| `birthday.self` | your birthday + party hat | Dashboard hero | first visit on your birthday (org timezone) |
| `birthday.teammate` | party hat on their buddy | Birthdays page, Team Today | that person's birthday |
| `team.complete` | 100% team today | manager/admin hero | last missing report arrives (once per day) |
| `streak.milestone` | streak milestone | Dashboard hero | streak reaches 5 / 10 / 30 |
| `reward.unlocked` | new item unlocked | hero + toast "Wear it" | `syncMyUnlocks()` returned items |
| `data.loading` / `insights.thinking` | looking / thinking | loading states, analytics | data pending |
| `save.error` | couldn't save | hero / forms | server action error |
| `poke` | reaction | your own buddy | click / tap |

App code fires moments (`mascotBus.emit(id)`), never engine methods. A `moment`-tier id
plays at most once per cooldown.

## 8. Rewards

| Item | Slot | Rarity | Unlock |
|---|---|---|---|
| Reading glasses, Bow, Daisy, Scarf | face / head / head / neck | Starter | day one |
| Sprout | head | Common | first report |
| Beanie | head | Common | 5-day streak |
| Shades | face | Rare | 10-day streak |
| Focus headphones | head | Rare | 25 reports on time |
| Bowtie | neck | Rare | 50 reports submitted |
| Crown | head | Epic | 30-day streak, or manager: team 100% on 10 days |
| Graduation cap | head | Epic | 1 year at the company |
| Halo | head | Legendary | a perfect month (every working day on time) |
| Party hat | head | Special | auto-worn on your birthday, kept after |
| Santa hat | head | Seasonal | wearable by everyone Dec 1–31 |
| Witch hat, Pumpkin skin | head / body | Seasonal | wearable by everyone Oct 20 – Nov 2 |

- Streaks count **working days only**; days off and holidays never break a streak.
- Unlocks are permanent, stored in `avatar_unlocks` (server-written), checked right after
  each report submit and once on dashboard load (`syncMyUnlocks`).
- Seasonal items are never owned; they're wearable in their window and come off after.
- The wardrobe shows locked items with rarity, hint and a progress bar.

## 9. Performance (measured, headless Chromium without GPU)

| What | Cost |
|---|---|
| Whole kit, min + gzip | ~30 KB (91 KB min); no images, fonts or audio |
| Hero buddy, plain | < 0.1 ms / frame |
| Hero buddy, heaviest outfit | 0.3–0.5 ms / frame (budget 16.7 ms) |
| 12 ambient buddies | 1.6–2.1 ms / frame |
| Static frame | ~0.15 ms first draw, then cached |

One shared RAF loop (stops when the tab is hidden), per-canvas off-screen pausing,
cached stills for lists, max 12 live per screen, sounds off, no network while animating.

## 10. Set aside (built, playable in Buddy Lab, off at launch)

Eye styles Classic/Sparkle/Dot, Soft cheeks, smoke puffs, sound effects, personality
picker, drop box outside the hero, dance party, front flip, manual boom easter egg,
weekly mood, teammates waving back, dynamic island hero.
