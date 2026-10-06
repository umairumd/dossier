# Dossier Buddy round 2

Work stays on `feat/dossier-buddy`. `_handoff/` stays untracked. Do not commit from this plan.

Spec: the Round 2 table in `_handoff/dossier-buddy-kit/docs/mascot/DESIGN.md`. It supersedes the settings, hero-state, and reward sections of [PLAN.md](PLAN.md) where they differ. The dynamic hero redesign is out of this round.

## 1. Engine sync

Replace `lib/mascot/` with `_handoff/dossier-buddy-kit/lib/mascot/` wholesale, and replace `components/mascot/mascot.tsx` with the handoff file. No hand-edits inside `lib/mascot/` at all. The handoff already contains `report.calm` (`setState("idle")`) and `report.overdue` (`setState("ratelimit")`), `const a0` in `shapes.ts`, and the eslint exceptions in `mascot.tsx`.

Do not copy `components/mascot/member-avatar.tsx`, `components/mascot/ambient-buddy.tsx`, or `components/mascot/unlock-toast.ts`. The handoff member avatar drops the app’s dynamic import, size classes, and `fitParent` stills.

What the handoff changes:

- Eye spacing clamps to 0.85–1.10 in `sanitizeAvatar`. Saved values above 1.10 shrink on the next read. The settings slider already uses `EYE_SPACING_RANGE`.
- `reaction` stays on `AvatarConfig` and in saved JSON. The engine ignores it. Taps default to `annoyance: "alternate"` (dizzy episode, then burst, then dizzy). No app call site passes `annoyance`.
- `<Mascot glow>` and `<Mascot lateNight>`, plus `isLateNight` / `LATE_NIGHT`. Late night also shortens doze to 1 minute inside the runtime when `lateNight` is set.
- `report.submitted` ends in a ~3 s dance. The app keeps emitting that moment; it does not add a dance of its own. A late submit stays `report.submittedLate` (tired, no dance).
- Halo unlock becomes `onTimeStreak` of 30. New body skins: Panda, Frog, Watermelon, Snowman, plus Cow, Tiger, Strawberry. `SET_ASIDE.accessories` is `cow`, `tiger`, `strawberry`.
- `RewardStats` gains required `onTimeStreak` and `longestOnTimeStreak`.

What fails typecheck until section 5 fills the new fields:

- The return in `lib/helpers/reward-stats.ts`
- `EMPTY_REWARD_STATS` in `lib/actions/avatar.ts`

What still compiles but is wrong until the later sections:

- The builder still renders “When poked”. The progress label does not treat `onTimeStreak` as days, so Halo would not read “12 / 30 days”. The label lives in `lib/helpers/unlock-progress-label.ts`, not in `lib/mascot/catalog.ts`, because the engine copy is not edited.
- `evaluateUnlocks` walks every accessory, including Cow, Tiger, and Strawberry, so `syncMyUnlocks` would insert and toast them. Filter `SET_ASIDE.accessories` before the upsert.
- Panda and Frog are starters, so the next `syncMyUnlocks` inserts them and `unlock-toast.ts` already skips starters.

Check: `npx tsc --noEmit`, `npm run lint`, and `npm run check:mascot`. `git status` does not list `_handoff/`.

## 2. Settings dialog

Remove the Your buddy card from `app/(app)/settings/page.tsx`. In the Profile card header, add a **Customise buddy** button (`CardAction`). It opens one dialog that contains the builder: live preview, Shuffle, Reset to my default, Look, Wardrobe, Save.

The builder moves from `components/settings/your-buddy-card.tsx` to `components/settings/customise-buddy-dialog.tsx`. Delete the “When poked” block and stop including `reaction` in the dirty key. `reaction` still round-trips through `sanitizeAvatar`.

Deep link, read on the server from `searchParams`:

- `?buddy=open` opens the dialog.
- `?wear=<id>` opens it and equips that item in the draft, same equippable rules as before. Save stays manual.
- Either param is enough to open. On close, `router.replace("/settings")` so a refresh stays closed.

Dirty close uses `components/ui/alert-dialog.tsx` inside the dialog: Discard / Keep editing. Overlay, Escape, and the X button take that path. Discard drops the draft and closes. Keep editing leaves it open. `beforeunload` stays while the dialog is open and dirty. In-app navigation is still not intercepted.

Layout, using `components/ui/dialog.tsx` (not the report Sheet):

- Desktop: wide dialog (`max-w-4xl`), preview beside the tabs, body scrolls, Save bar pinned to the dialog footer.
- Below `lg`: full viewport height, no centered card, preview on top, Save bar pinned to the bottom with safe-area padding.

Preview: `glow` and `lateNight` (section 4). Wardrobe still hides `SET_ASIDE`. Seasonal copy already prints a cross-month window, so Snowman reads “Dec 1 – Jan 31”.

Point the toast in `components/mascot/unlock-toast.ts` at `/settings?buddy=open&wear=<id>` instead of `#your-buddy`.

## 3. Dashboard nudge

In `HeroIntro` (`components/dashboard/hero-buddy.tsx`), change Customise from `/settings#your-buddy` to `/settings?buddy=open`. Copy, dismiss key `dossier-buddy-introduced`, and the “Dismiss” label stay.

## 4. Hero buddy

In `components/dashboard/hero-buddy.tsx` and the builder preview:

- Pass `glow`.
- Pass `lateNight={isLateNight(now, timeZone)}`. Recompute `now` every minute, and when the tab becomes visible. The runtime then dozes after 1 minute. Apply the same clock to the builder preview so it matches the hero.

Deadline window, only when today would otherwise be “due” (no report, not an off day, not full-day leave, sheet closed). `half_leave` stays on this ladder. Pass `timeZone` and `deadlineHourLocal` from the three dashboards. Compare the org hour (`hourCycle: "h23"`) to `deadlineHourLocal`, which is the first late hour:

- Earlier than the previous hour: `report.calm`.
- Previous hour (23 when the deadline hour is 0): `report.due` (the “!” badge).
- At or after the deadline hour, still no report: `report.overdue`.

Those moments already exist in the copied engine. Do not add them again.

Priority: sheet open → `report.writing`; else report exists → `report.done`; else off day or full-day leave → `day.off`; else the clock above. Re-apply on each minute tick, and again immediately when the sheet closes (the `sheetOpen` effect, not the next minute). A successful submit still skips that snap so the eat moment can play. Closing without a successful submit does not skip it.

Wave, one `auth.login` if either flag is missing:

- Sign-in: `sessionStorage` `dossier-buddy-waved`, set when it plays. Clear that key on logout, before the server redirect, in a client submit handler used by the Sign out forms in `components/layout/user-menu.tsx`, `app/(app)/settings/page.tsx`, `app/(auth)/deactivated/page.tsx`, and `app/(auth)/no-profile/page.tsx`.
- Org day: `localStorage` `dossier-buddy-day-wave:<userId>:<orgDate>`. Do not clear this on logout. A later visit the same day does not wave again; the next org day does, even if the tab stayed signed in.

Hover feed: the in-sheet **Submit Report** button already emits `report.dropHover`, `lookAt`, `report.dropReady`, and `report.dropCancel`. Add the same enter / leave / `lookAt` on the hero’s own **Submit →** trigger, only when `HeroReportStatus` opts in. Pointer leave does not emit `dropCancel` while the sheet is open. If the sheet closes without a successful submit, emit `report.dropCancel` when it closes, so the drop box never stays open. **Submit anyway** and **Edit Report** do not grow a hover feed.

The eat-and-dance stays the `report.submitted` moment from the copied engine. Do not add dance code in the form.

## 5. Rewards

In `lib/helpers/reward-stats.ts`, add `onTimeStreak` and `longestOnTimeStreak` with the same skip and break rules as the ordinary streak:

- Skip `weekly_off`, `holiday`, `leave`, `half_leave`, and a non-working day with no attendance row.
- A holiday with no attendance row is a working day and can break the run.
- `absent` and `late_major` break.
- Today with no report does not break.
- A report on a counted day increments the run only when `getSubmissionStatus` is `on_time`. A late report on a counted day breaks it. The ordinary streak still counts that late report as a hit.
- Exempt days are skipped before the report is considered, so a late report on half leave does not break the on-time run.

Add optional `today` on `RewardStatsInput`, defaulting to `todayInTimezone`, so fixtures do not depend on the clock. Pass that same day into `computeReportStats` so the ordinary current streak uses the fixture clock too.

Halo progress: `onTimeStreak` uses “day” / “days”, so 12 toward 30 renders `12 / 30 days`. The label helper is `lib/helpers/unlock-progress-label.ts` (outside `lib/mascot/`) and the wardrobe calls it.

`syncMyUnlocks` drops ids in `SET_ASIDE.accessories` before insert. Panda and Frog persist on the next dashboard sync and do not toast. Watermelon is 100 total reports. Snowman is wearable 1 Dec–31 Jan via the existing year-wrap in `inSeason`, and is never owned.

There is no test runner. Add `scripts/check-mascot-rewards.ts` and `"check:mascot": "npx tsx scripts/check-mascot-rewards.ts"`. It exits non-zero on failure.

Fixtures, all through `computeRewardStats` with a fixed `today`:

- Weekend between two on-time reports does not break either streak.
- Holiday with an attendance row is skipped; the same date with no row breaks both runs.
- Approved `leave` is skipped.
- `half_leave` is skipped, including when that day has a late report.
- A late report on a normal working day breaks the on-time run and still increments the ordinary streak.
- `absent` breaks both.
- Today unsubmitted does not break either run; yesterday unsubmitted does.
- A finished ISO week of on-time working days counts; the current week does not while a working day is still ahead. Same for a calendar month, including the month that becomes perfect on its last working day.
- Team-100%: every joined, non-exempt teammate reported; a missing report does not count; leave drops that person from the day; someone who joined later is ignored.

Catalog mapping, one case per rule kind: `starter`, `firstReport`, `streak`, `onTimeStreak` (Halo at 30, label `12 / 30 days`), `onTimeReports`, `totalReports` (Watermelon at 100), `perfectWeeks`, `perfectMonths`, `tenureDays`, `birthday`, `teamCompleteDays`, `season` (Snowman in window is wearable and not owned; out of window is not), `grant` never unlocks. Assert Panda and Frog are starters, and Cow, Tiger, and Strawberry are the only set-aside accessories.

## Manual test list

- Typecheck, lint, and `npm run check:mascot`.
- Settings: Profile shows Customise buddy; the old Your buddy card is gone. Dialog opens from the button, from `/settings?buddy=open`, and from `/settings?wear=<owned id>`.
- Look has no “When poked”. Spacing slider stops at 1.10. An old saved spacing above 1.10 loads clamped.
- Dirty dialog: X, overlay, and Escape ask to discard. Discard closes. Keep editing stays. Reload while open and dirty still warns.
- Mobile width: dialog is full height and Save stays on screen while the tabs scroll. Desktop: preview beside the tabs.
- Save, reload, dark mode, reduced motion, shuffle, reset.
- Wardrobe: Panda and Frog are owned after a dashboard load, with no toast. Cow, Tiger, and Strawberry are absent. Halo shows `n / 30 days`. Watermelon shows reports toward 100. Snowman’s badge reads Dec 1 – Jan 31.
- Nudge Customise lands in the open dialog. Dismiss still hides it.
- Hero glow is on. Before the last hour the buddy is calm; during that hour it shows “!”; after the deadline with no report it looks tired, not alarmed. Wait across a minute boundary or move the clock.
- After 10pm org time, lids get heavy and it dozes about a minute after the last input. Builder preview does the same.
- New sign-in waves, including sign out and back in the same day. A second dashboard visit that day does not. The next org day waves once without signing out.
- Hover the hero Submit button: the buddy opens and looks at it; leaving closes it. Closing the sheet without submitting closes the drop box and restores the resting state immediately. The sheet’s Submit Report button still does the hover, then the eat, then a short dance on an on-time submit. A late submit looks tired and does not dance. Submit anyway does not open the drop box on hover.

## Assumptions

- Late night and glow both apply to the hero and the builder preview.
- Only the working-day hero **Submit →** button gains the hover feed. Submit anyway and Edit Report do not.
- `lib/mascot/` is a wholesale copy. `report.calm` and `report.overdue` are not added by the app.
- Set-aside skins are not inserted into `avatar_unlocks`.
- Closing the dialog clears `buddy` and `wear` from the URL.
- A successful submit still skips the immediate resting snap so the eat moment is not replaced by “due” before refresh. Closing without a successful submit re-applies the resting state in that same close.
