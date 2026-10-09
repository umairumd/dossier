# Design language: plan

Branch `refactor/design-system`. Mockups: Claude Design canvas "Dossier Design", page "Design language · round 1".

## Decisions (Oct 9)

1. **Cards: the original look.** `surface-card` is exactly the card treatment from before this branch: the diagonal tint (primary 5% to transparent) and a 10% edge, no shadow, no fill of its own. `Card` and list cards add `bg-card`; the dashboard hero has no fill and sits on the page background, which is what gives it its contrast. Both the "Lifted" surface and giving every card a fill were tried and rejected (Oct 9). Card titles stay 16/500. No `ring-1` + `bg-card` cards, no `bg-muted` fills inside cards.
2. **Loading.** Skeletons are flat and dim (`--skeleton`, a slow breathe), no gradients. Skeleton shapes are redone per page **last**, once layouts are final; every page and section gets one. Content enters with `rise-in` (staggered with `--rise-delay`). Pages stream: each card loads in its own boundary.
3. **Sidebar: Inset.** Sidebar blends into the background; the page sits on a raised, rounded panel. The collapse button stays in the top bar next to the breadcrumbs.
4. **Report reader: proposed direction.** Header with who/when, previous/next and close together (arrow keys). Fields adapt to the template: text fields read as paragraphs; number fields group into a figure strip only when there are two or more, in template order; links, toggles and lists get their own compact rendering. Comments always visible, comment box pinned at the bottom.

## Scale

- Type: page title 24/600; big figure 28/600 tabular; card title 16/500; body 14; meta 12 muted; eyebrow 11/500 caps (`label-eyebrow`). No 10px text.
- Radius: card 14 (`rounded-xl`), inset 12, control 9, pill full. Dialogs 18 (`rounded-2xl`).
- Spacing: 24 between page sections, 16 between cards, 20 card padding, 14 inset padding.
- Dialog backdrop: black 40% (light) / 60% (dark) with a light blur. Dialog surface: `surface-overlay`.

## Steps

1. Foundations: tokens and utilities in `globals.css`, `Card`, `Skeleton`, dialog/alert/sheet backdrop and surface, button transitions, bespoke cards moved to `surface-card`. Done; surface and skeleton revised after review.
2. Home page below the hero (canvas page "Home · below the hero"): `CardLabelHeader` / `CardFooterLink`; streaks and "Needs a nudge" with faces; departments neutral until the deadline; compact admin shortcuts; neutral 30-day strip; recent reports header/footer. Built, awaiting review. Activity: `HomeActivityCard` (team / company / personal). Same activity log and permissions; on the home page each day's submissions fold into one non-clickable summary row (team/company), every other event keeps its own row with a scenario icon, grouped by day in the organisation's time zone, at most 6 rows, "All activity" footer. Employees keep their own "You submitted your report" row. The Activity page uses the same rows (Oct 9): scenario icons tinted by kind, "You" for the viewer, detail lines, day groups, and each day's submissions as one expandable row for managers and admins (not while searching by person). Recent report rows change with the reports area (they are shared with My Reports and profiles).
3. Sidebar and top bar (Inset). Built, awaiting review: the app frame (`bg-shell`) holds the sidebar; on desktop the page sits on a rounded, bordered panel that scrolls on its own (`data-app-panel`), with the top bar sticky inside it. Sidebar: organisation at the top, 36px items with a neutral active fill, 11px section labels, you at the bottom (`SidebarAccount`, opens the account menu). Collapse stays in the top bar. Phone: unchanged plain page, account menu in the top bar. The buddy hears panel scrolling (capture listener in `lib/mascot/runtime.ts`). The optional missing-reports count on Team Reports is not built.
4. Report reader (canvas board 5). Built, awaiting review: `ReportFields` (components/reports/report-fields.tsx) lays out answers in template order: long text as paragraphs, 2+ consecutive numbers as a figure strip, other short answers as a facts list, links as a chip with the site name; unanswered fields are hidden. Header: name (links to the profile), designation, n of m with previous/next and close; status, date and template underneath; Edit report for your own report today. Arrow keys move between reports. Comments always visible; comment box pinned at the bottom (Cmd/Ctrl+Enter sends).
5. Remaining pages on four shared patterns (canvas page "Pages · shared patterns"): lists, people cards, forms, page header. Batch 1 (Team Reports, Track Reports, My Reports history) done. Batch 2 (Employees, Departments, Invitations) built, awaiting review. Then Employees/Departments/Invitations, Team Members/Birthdays, Settings/Organization, Attendance; then the default button height (36px) and removal of 10px text.
6. Loading, last: audit every route and section for a loading state; skeletons that mirror each final layout; streaming boundaries; `rise-in`.
