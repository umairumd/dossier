# Design language: plan

Branch `refactor/design-system`. Mockups: Claude Design canvas "Dossier Design", page "Design language · round 1".

## Decisions (Oct 9)

1. **Cards: the original look.** `surface-card` is exactly the card treatment from before this branch: the diagonal tint (primary 5% to transparent) and a 10% edge, no shadow, no fill of its own. `Card` and list cards add `bg-card`; the dashboard hero has no fill and sits on the page background, which is what gives it its contrast. Both the "Lifted" surface and giving every card a fill were tried and rejected (Oct 9). Card titles stay 16/500. No `ring-1` + `bg-card` cards, no `bg-muted` fills inside cards.
2. **Loading.** Skeletons are flat and dim (`--skeleton`, a slow breathe), no gradients. Skeleton shapes are redone per page **last**, once layouts are final; every page and section gets one. Content enters with `rise-in` (staggered with `--rise-delay`). Pages stream: each card loads in its own boundary.
3. **Sidebar: Inset.** Sidebar blends into the background; the page sits on a raised, rounded panel. The collapse button stays in the top bar next to the breadcrumbs.
4. **Report reader: proposed direction.** Header with who/when, previous/next and close together (arrow keys). Fields adapt to the template: text fields read as paragraphs; number fields group into a figure strip only when there are two or more, in template order; links, toggles and lists get their own compact rendering. Comments always visible, comment box pinned at the bottom.

## Scale

- Type: page title 24/600; big figure 28/600 tabular; card and tile title 14/500 (`card-title`); field label 13 muted (`field-label`); body 14; meta 12 muted; eyebrow 11/500 caps (`label-eyebrow`) for navigation, menu and table headings only. No 10px text.
- Radius: card 14 (`rounded-xl`), inset 12, control 9, pill full. Dialogs 18 (`rounded-2xl`).
- Spacing: 24 between page sections, 16 between cards, 20 card padding, 14 inset padding.
- Dialog backdrop: black 40% (light) / 60% (dark) with a light blur. Dialog surface: `surface-overlay`.

## Steps

1. Foundations: tokens and utilities in `globals.css`, `Card`, `Skeleton`, dialog/alert/sheet backdrop and surface, button transitions, bespoke cards moved to `surface-card`. Done; surface and skeleton revised after review.
2. Home page below the hero (canvas page "Home · below the hero"): `CardLabelHeader` / `CardFooterLink`; streaks and "Needs a nudge" with faces; departments neutral until the deadline; compact admin shortcuts; neutral 30-day strip; recent reports header/footer. Built, awaiting review. Activity: `HomeActivityCard` (team / company / personal). Same activity log and permissions; on the home page each day's submissions fold into one non-clickable summary row (team/company), every other event keeps its own row with a scenario icon, grouped by day in the organisation's time zone, at most 6 rows, "All activity" footer. Employees keep their own "You submitted your report" row. The Activity page uses the same rows (Oct 9): scenario icons tinted by kind, "You" for the viewer, detail lines, day groups, and each day's submissions as one expandable row for managers and admins (not while searching by person). Recent report rows change with the reports area (they are shared with My Reports and profiles).
3. Sidebar and top bar (Inset). Built, awaiting review: the app frame (`bg-shell`) holds the sidebar; on desktop the page sits on a rounded, bordered panel that scrolls on its own (`data-app-panel`), with the top bar sticky inside it. Sidebar: organisation at the top, 36px items with a neutral active fill, 11px section labels, you at the bottom (`SidebarAccount`, opens the account menu). Collapse stays in the top bar. Phone: unchanged plain page, account menu in the top bar. The buddy hears panel scrolling (capture listener in `lib/mascot/runtime.ts`). The optional missing-reports count on Team Reports is not built.
4. Report reader (canvas board 5). Built, awaiting review: `ReportFields` (components/reports/report-fields.tsx) lays out answers in template order: long text as paragraphs, 2+ consecutive numbers as a figure strip, other short answers as a facts list, links as a chip with the site name; unanswered fields are hidden. Header: name (links to the profile), designation, n of m with previous/next and close; status, date and template underneath; Edit report for your own report today. Arrow keys move between reports. Comments always visible; comment box pinned at the bottom (Cmd/Ctrl+Enter sends).
5. Cleanup (Oct 9): default control height 36px (buttons, inputs, selects; sm 32, lg 40, icons 36), no 10px text outside the attendance grid. Remaining pages on four shared patterns (canvas page "Pages · shared patterns"): lists, people cards, forms, page header. Batch 1 (Team Reports, Track Reports, My Reports history) done. Batch 2 (Employees, Departments, Invitations) done. Batch 3 (Team Members, Birthdays on `PersonCard`) done. Batch 4 (Settings, Organization on `SettingsSection`) done. Attendance: polish tried and reverted (Oct 9); the grid stays as it was, only the header follows the page header. Batch 5 (Oct 9), the rest in one pass: department detail (summary in the header, manager and template cards, 30-day completion line, members as one list), employee profiles (`FigureStrip` for streak, rate and last report; `CardLabelHeader` on every card; leave balance as one inset strip), report templates (list on `DataList` with a row menu; editor on `SettingsSection` with Details and Questions, one save bar, questions as a numbered list), and the signed-out screens (`AuthCard`: logo from the layout, one card, `AuthNotice` for errors and messages, quiet footer link). Report lists show the day, template, status and time, never the report's text (history lists and the home team tile). Attendance: "Your attendance" is one card, the calendar with the month summary beside it (rate, then on time / late / absent / leave); the team grid is unchanged. Supervisors (including managers supervising someone outside their departments) can now read their people's attendance (migration `20261009000001`).
6. Loading (Oct 9): every route has a `loading.tsx` built from `components/shared/skeletons.tsx` (PageHeaderSkeleton, ToolbarSkeleton, DataListSkeleton, CardSkeleton, ActivityRowsSkeleton, FigureStripSkeleton, SettingsSectionSkeleton, PersonCardGridSkeleton). They use the real containers and show static text (titles, column headers, card labels) as is, so only data loads. Shapes were measured against the live pages at 1280px. `/dev/skeletons/<route>` shows a route's skeleton in development (404 in production). Not done yet: streaming the home page per card, and `rise-in` on arrival.

## Colour (Oct 10, branch `refactor/color-system`)

Option D from the canvas page "Colour · surfaces". Dark mode uses one neutral ramp (no blue tint):
- Base `#070708` for shell and page; card `#101012`; raised (menus, dialogs) `#18181b`.
- Card treatment (`surface-card`): white sheen 4.5% from the top-left and a 9% edge; no top light or second stroke. Every surface on a page is a card (`Card`, `surface-card bg-card`, or `Tile surface="card"` for the 30-day chart and My Reports' today tile); see-through tiles (`Tile`, inset) only inside the hero.
- Fills: `bg-fill-subtle` (tiles, fields, notices), `bg-fill-hover`, `bg-fill-active`. Lines: `border-line` / `divide-line` (dividers), `border-edge` / `ring-edge` (outlines), `line-strong`. No `foreground/[x]` opacities in components.
- The accent picker and the Classic surface switch were removed (Oct 10). Accent colours may come back later, tied to the buddy's colour.
- Light mode is unchanged; the same tokens resolve to foreground-relative values there.

## Design audit fixes (Oct 11, branch `refactor/design-audit-fixes`)

- Contrast: no faded secondary text (`text-muted-foreground/30–60`); readable text uses `text-muted-foreground`. Light `--muted-foreground` darkened to pass on the grey base.
- Status colours: one token per meaning, light and dark (`ok`, `warn`, `danger`, `severe`, `leave`, `info`, `holiday` → `text-ok`, `bg-leave/15`, ...). No raw palette classes (green, amber, purple...) in components. Attendance grid, calendar, popovers and legend share `calendarDayToneClass`; leave is purple everywhere.
- Day off: the date control turns amber with plain "Day off" text; elsewhere it is the `off` badge (amber, cup icon). Status labels are sentence case (On time, On leave, Day off).
- Copy: no long dashes or emoji in messages; at most one middle dot per line.
- Light mode: grey base (`--background` = shell), white cards and popovers, no card sheen; the hero gets a soft white wash.
- Radii: buttons `md`/`lg`, cards `xl`; one-off pixel radii removed.
- Home: shortcut cards moved to a client component (`shortcut-card.tsx`) so the dialog triggers render on the server.

## Card titles (Oct 12, branch `refactor/card-titles`)

Canvas page "Card titles". Cards and tiles name themselves in sentence case instead of a small uppercase label.
- `CardTitleHeader` (was `CardLabelHeader`) and `TileHeader` take `title` and render `card-title`: 14px medium, full contrast. The aside stays 12px muted.
- Labels above a value inside a card (Details, Assignments, report fields) and the hero's figure labels use `field-label`: 13px muted, sentence case. This matches `FigureStrip` and the leave balance figures.
- `label-eyebrow` stays only for sidebar section headings, dropdown menu labels and attendance grid headings.
