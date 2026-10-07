# Dynamic hero

Branch `feat/dynamic-hero`. `_handoff/` stays untracked. Do not edit `lib/mascot/` or `components/mascot/`. No commit unless asked.

Mockups: `_handoff/dynamic-hero/mockups-v3/`. The header (buddy, greeting, meta, context line, role stats, "Meet your buddy") stays. For you stays under the deck. There is no Remind button and no "Open team page" link in the hero.

## Deck

The report, progress, and team tiles are one area.

At rest:

- The report tile is always full width, when the person reports.
- Under it, from `md` up, `grid-cols-2 items-stretch`: Progress and Team today, equal width. No team: Progress is full width. Excluded from reporting with a team: that same row, and no report tile. Excluded with no team: Progress only.
- Below `md`: Report, Team today, Progress, For you.

Opening the report form or the team view replaces every tile with that one view. Collapse brings the tiles back. Header and For you do not move.

`useHeroPanel` holds `report` or `team`. `?hero=report` and `?hero=team` deep-link. One at a time. Escape closes. Focus moves into the view and back to the button that opened it. A pointer close does not show a focus ring.

Motion: tiles fade and scale down (opacity 1→0, scale 1→0.98, ~150ms). The area height then animates to the view (~250ms, `cubic-bezier(0.2,0,0,1)`), and the view fades and scales in. Close reverses it. Where `document.startViewTransition` exists, the clicked tile morphs into the view (`view-transition-name` on the tile and the view). Reduced motion swaps instantly. On a phone the open view scrolls to the top of the area. The report view keeps its fixed Submit bar.

The buddy still plays `report.writing` for the report. It does not play `insights.thinking` for the team view.

## Report tile

Rest (mockup G): left side is the eyebrow "Today's report", muted "Due 6:00 PM", and the big time left (34px / 28px, amber in the last hour, "Past due" after). Right side is "Draft saved h:mm" only when a draft exists, and "Continue report" or "Write report". A 4px bar runs the full content width along the bottom, from shift start to the deadline.

Submitted is one compact line: check, "Report submitted", time, On time / Late, "Edit report".

Off day: today's sentence and "Submit anyway". Full-day leave with no report: "You're on leave today." No form.

The open view (mockup J): "Today's report", "Due 6:00 PM", time left, Collapse. Then the bar and the existing inline form.

## Progress

Eyebrow "Your progress". Streak on the right ("8-day streak") when it is above 0.

Unseen unlock: buddy wearing it, "New unlock", the item name, reason and relative time, primary **Wear it**, and an X. One "Next" row under that. Wear it calls `saveMyAvatar` with `equipAccessory` (skin rules apply), marks the row seen, toasts "Now wearing Shades" with Customise → `/settings?buddy=open`, and refreshes so the header buddy updates. X marks it seen and does not equip.

Otherwise "Up next": the two closest locked items (`unlockProgress`, no starters, seasonal, or `SET_ASIDE`), each faded, with the label and a 4px bar. Footer "Wardrobe →".

`avatar_unlocks.seen_at` is null until seen. Unseen means that, unlocked in the last 14 days, not a starter, not set aside, newest first. `markUnlockSeen(itemId)` uses the admin client and filters `profile_id`. Saving from the wardrobe dialog marks equipped items seen.

## Team today

Compact tile, same height as Progress. Eyebrow and the deadline on the right (amber in the last hour, "Deadline passed" after, hidden on an off day). 64px ring, N/M, "K not in yet" or "Everyone's in", up to three faces and first names. One latest line (face, first name, excerpt) opens `ReportDetailSheet`. None yet: "No reports yet today". One button: **View team**.

The team view (mockup H) replaces the tiles. Header: small ring, title, "5 of 7 in · 48 min to deadline", Collapse. Three columns, stacked on a phone:

- Not in yet: face, name, designation, or "half day" when that applies.
- Submitted: face, name, time, a comment count only when above 0, a late tag when late, Read. Five rows, then "+N more" expands. Read opens the sheet; previous and next walk every submitted report.
- Away today: dimmed face, name, "On leave until Oct 9" or "Off today".

Away is leave, holiday, weekly off, or an org off day without a report. `half_leave` stays in Not in yet. Empty roster: "No team members assigned yet".

## For you

Same `cleared_at` rules. One item is full width, two items are two columns, three or more are three columns. Phone is one column. "+N more" expands. The card uses `border border-foreground/10`. Overflow is clipped only while the dismiss animation runs.

## Completion chart

A 30-day line, not 7-day bars, on the manager dashboard ("Team completion") and the admin dashboard ("Company completion"). Working days only: skip org off days and days the whole roster is on holiday. About 22 points. The previous 30 days supply the "up N pts" line; omit that line when they are not loaded.

Straight segments, 2px, round caps. Dark line `#c9ccd1`, light line `#3f434a`, area wash at 6%. Today is a filled foreground dot with a 2px surface ring and its value above-left. Y ticks 0 / 50% / 100%. X labels every 5th working day and "Today", dropping any label within about 40px of Today. Hover, touch, and keyboard: crosshair, dot, tooltip with the date, "92% · 7 of 8 in", and "Missing: names". Plot height 200px desktop, 160px phone. The line draws in over 400ms unless motion is reduced. Footnote: "Weekends and holidays are skipped. Includes voluntary submissions."

The old embedded chart was 0px tall on `md` because `h-full` and `min-h-0` collapsed it. The plot has an explicit height.

## Still later

**D — retire the sheet.** Report banner and report-detail "Edit Report" become `/?hero=report`. `report_deadline` resolves there. Delete the sheet and its listeners. Until then the sheet stays for the Reports page and for the reader's own edit.

## Checks

Employee: report full width, progress under it, no team. Manager and admin: report, then progress beside team; View team replaces the deck; the 30-day line has a height. Excluded with a team: progress and team, and the team view. Excluded alone: progress only. Phone: stacked, open view scrolls up, report keeps the submit bar. `?hero=team` opens the view. Reduced motion does not animate.
