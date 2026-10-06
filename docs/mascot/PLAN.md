# Dossier Buddy

Every person in Dossier is shown as a small flat character ("buddy") stored in `profiles.avatar`. Still faces everywhere; your own buddy is alive on the dashboard hero and in Settings; ambient buddies (max 12 live canvases) appear on Team Today and Birthdays. App code fires moments through `mascotBus.emit`. It never calls the engine, except `lookAt` on the report Submit button.

Dossier has no profile photos. `profiles.avatar_url` stays in the database and on the types, and nothing renders it. `MemberAvatar` accepts `avatarUrl` only so old call sites compile, then ignores it. The port removes that prop from callers and passes `avatar` (`profiles.avatar`) instead.

Launch scope from [DESIGN.md](DESIGN.md):

- Free identity: 9 shapes, 12 flat palettes, eye styles Pill / Round / Tall / Oval / Sleepy, size and spacing sliders, cheeks None / Rosy / Freckles, poke reaction Dizzy (default) or Bursts, four accessory slots.
- Idle personality comes from the user id. There is no picker.
- Set aside and absent from the UI (`SET_ASIDE` in `lib/mascot/curation.ts`): Classic / Sparkle / Dot eyes, Soft cheeks, sound, smoke, personality picker, drop box outside the hero, dance, front flip, manual boom, weekly mood, teammates waving back, dynamic island. Saved set-aside values still render.
- Rewards: starters on day one, then streak, on-time, volume, tenure, birthday, perfect month, and manager team-100% items. Seasonal Witch hat and Pumpkin skin (Oct 20–Nov 2) and Santa hat (Dec 1–31) are wearable in-window and never owned.
- Moments in DESIGN.md §7, wired below. Anger only comes from poking your own buddy.

## Branch and safety

Work stays on `feat/dossier-buddy`. Never commit to `main`.

`_handoff/` is the package source and is not committed. The public mirror must not receive `reference/` or `_internal-reference/`. [.gitignore](../../.gitignore) anchors these to the repo root:

```
/_handoff/
/reference/
/_internal-reference/
```

`lib/mascot/` is copied as-is, including `THIRD_PARTY_NOTICES.md`. `reference/buddy-lab.html` is not copied. DESIGN.md and HANDOFF.md live in `docs/mascot/` so the spec stays in git after `_handoff/` is ignored.

No new npm dependencies. Slider and Progress already ship inside the installed `radix-ui` package. Add shadcn-style wrappers only.

## Data and migration

Copy `_handoff/dossier-buddy-kit/supabase/migrations/20261006000001_mascot_avatars.sql` to [supabase/migrations/20261006000001_mascot_avatars.sql](../../supabase/migrations/20261006000001_mascot_avatars.sql). That name already sorts after the latest migration, `20261003000006_notifications_delete_policy.sql`.

The migration adds:

- `profiles.avatar jsonb`, null or a JSON object under 2048 bytes. Null means `defaultAvatar(id)` at read time.
- `avatar_unlocks (profile_id, item_id, source, unlocked_at)` with RLS select-own. No insert/update/delete policies. Writes use `createAdminClient()` in `lib/actions/avatar.ts`.

Backfill runs only where `avatar is null`: random shape and palette, Tall eyes, size 1, spacing 1, cheeks none, reaction dizzy, no accessories. Safe to re-run. Today every existing row is null, so the backfill covers the whole company. New people get `defaultAvatar(userId)` until they save.

`profiles.avatar_url` is not altered.

RLS for `profiles.avatar`: `profiles_update_own` in `supabase/migrations/20260730120005_enable_rls.sql` is `using (id = auth.uid()) with check (id = auth.uid())` with no column allow-list. Members can already update `avatar`. `saveMyAvatar` is the only writer. `updateOwnProfile` in `lib/actions/settings.ts` keeps writing `full_name` and `date_of_birth` only.

Verify after migrate:

```sql
select count(*) filter (where avatar is null) as still_null,
       count(*) filter (where avatar is not null) as filled
from public.profiles;

select avatar->>'shape' as shape,
       avatar->>'palette' as palette,
       count(*)
from public.profiles
where avatar is not null
group by 1, 2
order by count(*) desc;

select avatar->'eyes'->>'style' as eye_style, count(*)
from public.profiles
where avatar is not null
group by 1;
```

Expect `still_null = 0`, `eye_style = tall` on every backfilled row, and shapes/palettes spread across the 9 × 12 launch lists.

Types: add `avatar: unknown | null` on `Profile` ([types/profile.ts](../../types/profile.ts)). Leave `avatar_url` on `Profile`, `EmployeeListItem`, and the other types exactly as they are. Add `avatar` (not a replacement for `avatar_url`) on the row types that feed a buddy: `EmployeeListItem`, `TeamMemberOverview`, `TeamMemberReport`, `ReportComment.profiles`, `BirthdayPerson`, `DepartmentMember`, `DepartmentManager`, and the org-chart node. Always pass the raw value through `sanitizeAvatar(raw, profileId)`. There is no generated `Database` type to update.

Queries that must select `avatar`:

- `lib/supabase/queries/profile.ts` `getCurrentProfile` (hero, user menu, settings)
- `lib/supabase/queries/admin/employees.ts` `PROFILE_SELECT`
- `lib/supabase/queries/manager/team.ts` and `lib/supabase/queries/supervisor/team.ts`
- `lib/supabase/queries/manager/employee-overview.ts`
- `lib/supabase/queries/admin/org-reports.ts`
- `lib/actions/reports.ts` comment profile embeds
- `lib/supabase/queries/admin/birthdays.ts` — add `avatar` only
- `lib/supabase/queries/admin/departments.ts` manager and member selects

Call sites stop passing `avatarUrl` / `avatar_url` into `MemberAvatar` and pass `avatar` instead. That includes the ones that pass a photo today ([components/admin/employee-list.tsx](../../components/admin/employee-list.tsx), attendance, team reports, team today, report comments, profile headers) and the ones that pass neither ([components/admin/org-chart.tsx](../../components/admin/org-chart.tsx), [components/manager/team-member-card.tsx](../../components/manager/team-member-card.tsx), department list and detail, birthdays). [components/layout/user-menu.tsx](../../components/layout/user-menu.tsx) and [components/dashboard/dashboard-hero.tsx](../../components/dashboard/dashboard-hero.tsx) switch from `BotAvatar` to the buddy and take `avatar` from the profile.

## UI design

Visual language already in the app: `card-gradient` cards, `rounded-xl`, `ring-1 ring-foreground/10`, `label-eyebrow`, `text-muted-foreground`, shadcn `Card`, `Tabs`, `Button`, `Badge`, `Separator`, `Tooltip`, sonner toasts. Buddy colours are the flat palette hexes, so they read the same in light and dark. Chrome around them follows the theme. New wrappers: `components/ui/slider.tsx` and `components/ui/progress.tsx` from `radix-ui`.

The kit builder in `_handoff/.../avatar-builder.tsx` is behaviour reference only. Shipped UI is a Dossier card.

### Settings → Your buddy

Lives on the single settings page [app/(app)/settings/page.tsx](../../app/(app)/settings/page.tsx), as a `Card` between Profile and Performance. `/settings/profile` already redirects here. Anchor `id="your-buddy"`. No new nav item.

Purpose: edit the signed-in person’s buddy, see locked rewards, save `profiles.avatar`.

Desktop (`lg+`):

```
+------------------------------------------------------------------+
| Your buddy                                                       |
| A small character that's yours. It shows up around Dossier.      |
|                                                                  |
| +----------------------+   [ Look ] [ Wardrobe ]                 |
| |                      |   Shape                                 |
| |     live preview     |   orb soft pebble ...                   |
| |        160 px        |   Colour                                |
| |                      |   swatches                              |
| |  Shuffle             |   Eyes                                  |
| |  Reset to my default |   Pill Round Tall Oval Sleepy           |
| +----------------------+   Eye size     ----o----                |
|  (sticky)                Eye spacing  ----o----                |
|                            Cheeks                                |
|                            None  Rosy  Freckles                  |
|                            When poked                            |
|                            ( ) Gets dizzy   ( ) Bursts           |
|                                                                  |
|                                              [ Save ]            |
+------------------------------------------------------------------+
```

Mobile: preview on top, full width, then the tabs. Save sits in a bar stuck to the bottom of the card (`sticky bottom-0`, background `bg-card`).

Components: `Card`, `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`, `Button`, `Badge`, `Slider`, `Progress`, `Tooltip`, `Separator`. Shape, colour, eyes, cheeks, and poke are `aria-pressed` toggle buttons. Sliders have visible labels “Eye size” and “Eye spacing”.

Look tab offers only `ACTIVE_SHAPES`, all 12 palettes, `ACTIVE_EYE_STYLES`, `ACTIVE_CHEEKS`, and reactions `dizzy` / `burst`. Labels: “Gets dizzy”, “Bursts”.

Wardrobe groups by slot: Head, Face, Neck, Body. One equipped item per slot. Owned items are selectable. Locked items show a lock icon, rarity `Badge`, the catalog `hint`, and `unlockProgress` as `Progress` (“3 / 5 days”). Seasonal items show a badge “Oct 20 – Nov 2” or “Dec 1 – 31” and are selectable only while `isWearable` in the org timezone. A fresh unlock shows a “New” dot until the item is opened; seen ids live in `localStorage` key `dossier-buddy-seen-unlocks`.

Copy:

- Title: “Your buddy”
- Description: “A small character that's yours. It shows up around Dossier.”
- Shuffle keeps accessories and randomises shape, colour, eyes, and cheeks via `randomAvatar()` (active lists only).
- “Reset to my default” loads `defaultAvatar(userId)` (stable shape and colour from the id, Tall eyes, no cheeks, Dizzy, no accessories).
- Save: “Save”, then “Saving…”. Disabled while the draft `avatarKey` matches the saved key, and while saving.
- Success toast: “Buddy saved.” Error toast uses the action error string.

States:

- Loading: server renders the saved avatar. The preview shows `MascotStatic` until the live canvas reports ready, so the box does not start empty.
- Empty: wardrobe always lists the catalog, including locked rows. No empty state.
- Error: toast, `mascotBus.emit("save.error")`, draft kept.
- Unsaved: Save enables. `beforeunload` warns on tab close or reload. In-app link clicks are not intercepted.

Preview is the live buddy: `interactive`, follow `"region"`, `sleepAfterMs={LAUNCH.sleepAfterMs}`, `listen` so save errors play here too. `prefers-reduced-motion` is handled inside the engine (no spins, shakes, hops, pops).

### Dashboard hero

One component for member, manager, and admin: [components/dashboard/dashboard-hero.tsx](../../components/dashboard/dashboard-hero.tsx), used by `employee-dashboard.tsx`, `manager-dashboard.tsx`, and `admin-dashboard.tsx`. Role routing stays in [app/(app)/(home)/page.tsx](../../app/(app)/(home)/page.tsx).

Replace the 96px `BotAvatar` with a live buddy in the same `flex items-center gap-5` slot. Size 96, same as today’s hero. Greeting, designation, context line, and the stat grid stay. [HeroReportStatus](../../components/dashboard/hero-report-status.tsx) stays in the full-width row under the divider, including [DayOffTag](../../components/shared/day-off-tag.tsx) (“Day off”).

Desktop: buddy at the left of the identity column; stats at the right (`md:flex-row`). Mobile: identity stacks above the 2-column stats, then the status row (`flex-col`).

`isOffDay` stays the current rule: not an org working day, or today’s attendance status is `holiday`. The Day off pill does not change. The buddy’s resting state is wider than that pill: a working day with approved full-day leave (`attendance` status `leave`) also uses `day.off`. `half_leave` stays `report.due` until they submit.

New client child `components/dashboard/hero-buddy.tsx` owns the canvas, the moment listener (`userId` = profile id), and the persistent state. Follow region is the hero card.

### Reward unlocked

After `syncMyUnlocks()` returns non-starter ids, a sonner toast: “Beanie unlocked” (or “2 items unlocked”). Action label “Wear it” goes to `/settings?wear=<id>#your-buddy`, which equips that item in the draft (still unsaved). The hero emits `reward.unlocked`. Starter items (glasses, bow, daisy, scarf) are inserted on first sync and do not toast.

### First-run nudge

Once, on the dashboard hero, if `localStorage` `dossier-buddy-introduced` is unset:

```
Meet your buddy. Make it yours.          Customise    ×
```

“Customise” links to `/settings#your-buddy`. Dismiss writes the key. `aria-label` on the dismiss button: “Dismiss”.

### Team Today and Birthdays

[components/dashboard/team-today-panel.tsx](../../components/dashboard/team-today-panel.tsx) (manager home only; admin home has no Team Today panel) and [components/birthdays/birthday-list.tsx](../../components/birthdays/birthday-list.tsx) (owner/admin).

Ambient: idle personality only, no cursor follow, no poke. A shared slot budget per page, `LAUNCH.maxLiveAvatars` (12). Visible canvases take a slot; everyone else stays `MascotStatic`. The engine’s `IntersectionObserver` pauses canvases that scroll off screen.

Party hat: when that person’s `date_of_birth` month-day equals `todayInTimezone(settings.timezone)`, the displayed avatar wears `partyHat` on the head for the day. Birthdays currently decide “Today” with the browser clock (`useNow` in the list). The hat and the Today badge both use the org date passed from the server.

### Avatars everywhere else

[components/shared/member-avatar.tsx](../../components/shared/member-avatar.tsx) becomes a re-export of `components/mascot/member-avatar.tsx`. Existing size tokens stay (`xs` 20 through `hero` 96, including the `team-member-card` override `size-10 sm:size-16`). Static images are cached stills from `renderStatic`. Boxes do not change. The user menu is a 32px still, `interactive={false}`, and it never listens for moments.

## State and moment wiring

Persistent hero state, applied whenever these inputs change (state-tier, so re-applying is safe):

1. Submit sheet open → `report.writing`
2. Else today’s report exists → `report.done`
3. Else `isOffDay` or today’s attendance status is full-day `leave` → `day.off`
4. Else → `report.due`

`half_leave` does not take the `day.off` branch. The Day off pill still renders only from `isOffDay` inside `HeroReportStatus`.

Sheet open/close is `onOpenChange` in [components/reports/submit-report-sheet.tsx](../../components/reports/submit-report-sheet.tsx). The in-sheet button is “Submit Report” in [components/reports/dynamic-report-form.tsx](../../components/reports/dynamic-report-form.tsx).

Launch moments:

- `auth.login` — `hero-buddy.tsx` mount. Once per tab session (`sessionStorage` `dossier-buddy-waved`).
- `idle.doze` / `idle.wake` — engine, `sleepAfterMs={8 * 60 * 1000}` on the hero and the builder. App does not emit these.
- `cursor.notice` — engine, when the pointer returns after 3s. Touch devices wander instead of following.
- `report.due` / `report.writing` / `report.done` / `day.off` — `hero-buddy.tsx` from the rules above.
- `report.dropHover` / `dropReady` / `dropCancel` — pointer enter / down / leave on the sheet Submit button. Enter also calls the hero controller `lookAt(button)`. Leave-without-submit (sheet close) emits `dropCancel` and the persistent state returns.
- `report.submitted` / `report.submittedLate` — `dynamic-report-form.tsx` after `submitDailyReport` success. Late vs on time comes from the action (see Rewards). Edit (`updateDailyReport`) does not replay the eat.
- `day.offSubmit` — hero trigger “Submit anyway” ([hero-report-status.tsx](../../components/dashboard/hero-report-status.tsx)), then the sheet’s writing state.
- `notification.new` / `comment.received` / `leave.approved` / `leave.rejected` — dashboard load only, from the server-rendered unread list. No realtime subscription (later enhancement). At most one of these per load, priority: `leave_approved` or `leave_rejected`, then `report_commented`, then any other unread type as `notification.new`. Already-read notifications never fire. Watermark: `localStorage` key `dossier-buddy-notif-at:<userId>` stores the newest `created_at` that already played. Only an unread notification newer than that watermark can play, and the watermark advances to that row’s `created_at`. Reloading does not repeat it. If `auth.login` plays on the same load, the notification moment starts about 2.5s later so the two never overlap. The user-menu avatar stays a still and does not ping.
- `birthday.self` — hero, first visit on the org-timezone birthday (`localStorage` `dossier-buddy-bday-<year>`). Display wears the party hat that day.
- `birthday.teammate` — Team Today and Birthdays, `mascotBus.emit("birthday.teammate", { userId })` for each birthday person whose ambient buddy is mounted.
- `team.complete` — manager hero when `missingToday === 0` and `teamSize > 0`; admin hero when `completionPercentageToday === 100` and `totalMembers > 0`. Once per org date (`localStorage`). This fires on load/refresh when the day is already complete. There is no live feed of the last teammate’s submit.
- `streak.milestone` — hero, when `currentStreak` is 5, 10, or 30 and greater than the last celebrated value (`localStorage` `dossier-buddy-streak-seen`).
- `reward.unlocked` — hero, when `syncMyUnlocks` returns non-starter ids.
- `data.loading` — not fired at launch. Same as `insights.thinking`: no client pending state is wired to the hero.
- `insights.thinking` — not fired. Manager and admin insights are awaited on the server. The moment stays in the engine.
- `save.error` — `saveMyAvatar` failure, `updateOwnProfile` failure in `components/settings/profile-form.tsx`, and report submit/update failure in `dynamic-report-form.tsx`.
- `poke` — engine, click/tap on the hero and the builder preview only.

Moment-tier ids already cooldown inside the engine (`MOMENT_COOLDOWN_MS`). The session/day/watermark keys above stop repeats across navigations.

## Rewards

Implement `getRewardStats` in `lib/actions/avatar.ts` via a new helper `lib/helpers/reward-stats.ts`. `computeReportStats` in [lib/helpers/report-stats.ts](../../lib/helpers/report-stats.ts) already returns `currentStreak` and already skips `weekly_off`, `holiday`, `leave`, and `half_leave`, and does not break on an unsubmitted today. It does not return longest streak, on-time counts, perfect weeks, or perfect months. Keep the dashboard stat as it is; add the reward math beside it.

Inputs, all for the signed-in profile:

- Reports: `getReportStatsData` (`report_date`, `submitted_at`, full history).
- Attendance: `attendance_records` status by date. Rewards need the full history, not the settings page’s 399-day window.
- Org: `workingDays`, `timezone`, deadline from `getOrganizationSettings` / `getDeadlineContext`.
- Tenure: calendar days from `profiles.created_at` to `todayInTimezone`. There is no `joined_at`. Known limitation: tenure is “days since this profile row was created,” which matches invite-accept for people who joined through Dossier and is the only date we store. Target for the graduation cap is 365.
- Birthday: `date_of_birth` month-day vs the org today. Null DOB → not today.
- On time: `getSubmissionStatus(...) === "on_time"` in `lib/reports/submission-status.ts`.
- Longest streak: walk history with the same skip and break rules as `computeReportStats` (`absent` and `late_major` still break). Today’s missing report does not break it.
- Perfect week: an ISO week whose every non-exempt working day has an on-time report, and which has at least one such day. The current week counts only when no working day remains.
- Perfect month: same, for a calendar month in the org timezone. The current month counts only after its last working day is on time.
- `teamCompleteDays`: role `manager` only. A past working day counts when every current teammate who had already joined (`created_at` on or before that date) and was not attendance-exempt that day has a report. Look back 400 days. Members, admins, and owners stay at 0. The admin hero can still play `team.complete`.

`saveMyAvatar` passes `settings.timezone` into `isWearable`.

`syncMyUnlocks()` runs:

- At the end of a successful `submitDailyReport` in `lib/actions/reports.ts`, not on `updateDailyReport`.
- Once per load in all three dashboard server components.

Extend `SubmitReportResult` with `onTime: boolean` and `unlocked: AccessoryId[]` so the client can pick `report.submitted` vs `report.submittedLate` and raise the toast without recomputing the deadline.

Edge cases: a holiday with no attendance row is treated as a working day and can break a streak (same limit as the dashboard streak). Seasonal items are never inserted into `avatar_unlocks` and are stripped by `sanitizeAvatar` outside the window. Party hat is granted on the birthday visit and kept; auto-wear that day is a display override, not a silent save. Starters unlock on first sync and do not toast.

## Performance

Kit cost from DESIGN.md §9: about 30 KB gzip for the whole engine, hero under 0.5 ms/frame, 12 ambient buddies about 2 ms/frame, stills cached after the first draw. One shared rAF loop that stops when `document.hidden`. Sounds stay off (`LAUNCH.sound` is false). No network while animating.

`MascotStatic` draws through `renderStatic`, so the engine loads on any page that shows an avatar. That is expected: one cached ~30 KB gzip chunk. `next/dynamic` is only for the live `<Mascot>` canvas (`live` or `interactive`).

The limit that matters is the number of live canvases:

- Dashboard hero: 1
- Settings builder preview: 1
- Team Today or Birthdays: at most 12 ambient, idle only

Off-screen pause is the engine `IntersectionObserver` in `lib/mascot/runtime.ts`. Do not add a second loop. The user menu stays `MascotStatic`, so the nav does not add a live canvas on every route.

## Phases

Each phase stays on `feat/dossier-buddy`, passes `npx tsc --noEmit` and `npm run lint`, and is manually checked in light and dark, at a mobile width, with `prefers-reduced-motion`, and with touch (no cursor follow; taps poke only your own live buddy).

### 1. Foundation

Files: `.gitignore`; copy `lib/mascot/**` (with `THIRD_PARTY_NOTICES.md`); copy `components/mascot/mascot.tsx`, `mascot-bus.ts`, `member-avatar.tsx`; copy the migration; copy DESIGN.md and HANDOFF.md into `docs/mascot/`; add `avatar` on `Profile` only. Exclude `/_handoff/` from `tsconfig.json` and ESLint so the unshipped package is not typechecked twice.

The copy stays as-is except two lint fixes this repo requires: `const a0` in `lib/mascot/shapes.ts`, and an eslint exception on the client-only static-frame effect in `components/mascot/mascot.tsx`.

Acceptance: typecheck and lint pass; migration SQL is the kit file; `/_handoff/` is ignored; no UI change.

Verify: `git status` does not list `_handoff/` or `reference/`. `git check-ignore -v _handoff/dossier-buddy-kit/docs/mascot/DESIGN.md` matches `/_handoff/`.

### 2. Avatars everywhere (static)

Files: re-export `components/shared/member-avatar.tsx`; dynamic-import the live canvas inside the copied member avatar; the queries and types listed above (`avatar` added, `avatar_url` left in place); remove `avatarUrl` from every `MemberAvatar` call site and pass `avatar`. User menu uses the still buddy. Settings `ProfileHeader` drops `interactive` so that page stays static until phase 3.

Acceptance: every person renders as a buddy in the same box sizes as today; `avatar_url` is unused by the avatar component; live canvases are limited to surfaces that pass `live` or `interactive` (none on list pages in this phase).

Verify: employee list, org chart, department page, team card, comments, user menu, birthdays. Hard-refresh and confirm no layout jump.

### 3. Settings builder and wardrobe

Files: `components/ui/slider.tsx`, `components/ui/progress.tsx`, `components/settings/your-buddy-card.tsx`, the card on `app/(app)/settings/page.tsx`, `saveMyAvatar` with org timezone. Load owned ids from `avatar_unlocks` and stats from `getRewardStats` (until phase 5, starters are the rows that unlock).

Acceptance: Look and Wardrobe match the wireframe; set-aside options are absent; Save disabled until dirty; `beforeunload` fires when the draft is dirty; seasonal items follow the org date.

Verify: shuffle, reset, save, reload, dark mode, mobile save bar, keyboard through the tabs, reduced motion on the preview.

### 4. Live hero and moments

Files: `hero-buddy.tsx`, `dashboard-hero.tsx`, the three dashboards (pass `avatar`, report, off-day, and whether today is full-day leave), `submit-report-sheet.tsx`, `dynamic-report-form.tsx`, `hero-report-status.tsx`, a small controller registry for `lookAt`. First-run nudge. `submitDailyReport` returns `onTime` (unlock ids can be empty until phase 5). Notification moment picker on dashboard load, with the localStorage watermark and the 2.5s delay after `auth.login`.

Acceptance: hero state matches due / writing / done / late / day off, including full-day leave as `day.off` while the Day off pill stays tied to `isOffDay`; drop box plays on the sheet Submit button; login wave once per session; one notification moment per load, never replayed; doze after 8 minutes of no input; poke only on the hero. `data.loading` is not emitted.

Verify: submit on time, submit after the deadline hour, Submit anyway on a weekend, close the sheet without sending, a full-day leave (buddy resting, pill unchanged) and a half-day leave (still due), reduced motion, a phone-width layout, reload after a notification moment.

### 5. Rewards

Files: `lib/helpers/reward-stats.ts`, `getRewardStats`, `syncMyUnlocks` from `submitDailyReport` and the three dashboards, toast + Wear it, `?wear=` draft equip, “New” dots.

Acceptance: a first report unlocks Sprout; streak math ignores a weekend between two reports; a birthday in the org timezone grants and displays the party hat; starters persist without a toast.

Verify: SQL count of `avatar_unlocks` for the test user before and after submit; wardrobe progress bars; Wear it lands on an unsaved equipped item.

### 6. Team and birthdays

Files: `team-today-panel.tsx`, `birthday-list.tsx`, birthdays page (pass org today and `avatar`), the 12-slot budget.

Acceptance: the 13th visible buddy is a still; off-screen canvases pause; birthday teammates wear the party hat; `team.complete` once per day when the manager’s team or the admin org is at 100%.

Verify: a long team list, scroll, a birthday row, manager and admin heroes on a complete day and again after refresh.

### 7. Cleanup

Files: delete `components/shared/bot-avatar.tsx` and `components/shared/expression-pills.tsx`; remove their imports from `employee-hero-client.tsx`, profile header, and the hero. Drop the legacy `expression` prop on `MemberAvatar` once nothing passes it, and drop the deprecated `avatarUrl` prop once no caller passes it.

Acceptance: no remaining imports of either deleted file; typecheck and lint clean.

Verify: admin employee profile, settings header, dashboard, user menu.

## Risks and decisions

- **Photos.** Resolved: there are no profile photos. Every avatar is a buddy. `avatar_url` stays unused in the schema and types.
- **Eyes for existing members.** Resolved: the backfill uses Tall. Classic stays set aside and is not offered.
- **Notifications.** Resolved: dashboard load only, one moment, priority leave → comment → other, `localStorage` watermark per user, 2.5s after the login wave, menu stays still. Realtime notification moments are a later enhancement.
- **Full-day leave.** Resolved: the buddy uses `day.off`. The Day off pill and `isOffDay` stay as they are. Half-day leave stays `report.due`.
- **Unsaved edits.** Resolved: `beforeunload` plus a disabled Save until the draft changes. No confirm on in-app navigation.
- **Engine on list pages.** Resolved: static frames load the engine (~30 KB gzip, cached). Live canvases stay capped.
- **Loading moments.** Resolved: do not fire `data.loading` or `insights.thinking` at launch.
- **Tenure.** Known limitation: days since `profiles.created_at`, because there is no join date.
- **Starters.** Resolved: first sync inserts them and does not toast.
- **Halloween window.** Today is 6 Oct 2026. Witch hat and Pumpkin skin are wearable 20 Oct–2 Nov. Shipping before the 20th means those rows show as seasonal until the window opens. Shipping after 2 Nov misses them until next year. Santa is December. `inSeason` handles it.
- **`team.complete` timing.** It fires when you next load a 100% day, not at the instant the last report arrives.
- **Team-100% history** uses the current roster plus `created_at`, so it is an approximation of who was on the team that day.
- **Absent / `late_major`** still break streaks, matching `computeReportStats`. The spec calls out days off, holidays, and approved leave as the days that never break one.
- **Admin crown.** `teamCompleteDays` stays 0 for admins. They still get the `team.complete` moment. The crown’s team path is manager-only.
