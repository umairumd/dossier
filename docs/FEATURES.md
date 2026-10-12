# Dossier — Feature Map

What is built today, where it lives, and who sees it. Use this before starting
a feature to check whether it (or most of it) already exists. Updated Oct 12,
2026; update it in the same commit when a feature lands or changes.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) (how the app is put together),
[PERFORMANCE.md](PERFORMANCE.md) (how pages load data),
[PERMISSIONS.md](PERMISSIONS.md) (role rules), [UI_GUIDELINES.md](UI_GUIDELINES.md)
and [design/PLAN.md](design/PLAN.md) (design system). `DATABASE.md` and
`PRODUCT.md` describe the September state; `supabase/migrations/` is the
source of truth for the schema.

Roles: owner > admin > manager > member. A member can also be a supervisor
(`member_supervisors`), which unlocks the team pages for the people they
supervise.

## Navigation by role

| Page | Route | Who |
|---|---|---|
| Home | `/` | everyone (dashboard differs per role, see below) |
| My Reports | `/reports` | everyone |
| Activity | `/activity` | everyone (scope differs per role) |
| Team Reports, Team Members | `/team-reports`, `/team` | managers and supervisors |
| Track Reports | `/track-reports` | owner, admin |
| Attendance | `/attendance` | everyone (members their own month; managers and supervisors also their team) |
| Departments, Employees, Birthdays, Invitations | `/departments`, `/employees`, `/birthdays`, `/invitations` | owner, admin |
| Organization, Templates | `/organization`, `/organization/templates` | owner, admin |
| Settings | `/settings` | everyone |

Old `/admin/*`, `/manager/*` and `/supervisor/*` routes only redirect to the
pages above. `/dev/skeletons/<route>` shows a route's loading state in
development (404 in production).

## Home

- **Dashboards**: `components/dashboard/{admin,manager,employee}-dashboard.tsx`.
  Each card is its own async section inside a `Suspense` boundary; all cards
  sit inside the hero's boundary so the hero appears first.
- **Hero** (`dashboard-hero.tsx`): buddy, greeting, figures, today's report
  written inline, Your progress tile, team/company tile (managers, admins),
  For You notifications. Stays behind its skeleton until hydrated, because
  buddies are drawn on a canvas in the browser.
- **Your progress** (`hero-progress-tile.tsx`): next two wearable unlocks,
  new-unlock card, and four stat tiles (day streak, submission rate, on time,
  reports). Spans the hero for members (no team tile).
- **Team / Company today** (`hero-team-tile.tsx`): ring on desktop, bar on
  phones; opens a full team view in place.
- **For You** (`hero-for-you.tsx`): last 7 days of uncleared notifications,
  one column, repeats of the same notice collapsed into one row.
- Cards below the hero: completion line chart (manager, admin), Departments
  card with a date stepper (admin), Team highlights (manager), 30-day strip and
  recent reports (member), shortcut cards (admin), activity card (all).

## Reports

- **Who counts toward reporting**: active, onboarded, not archived, and not
  excluded with the "Exclude from reporting" toggle (`is_reporting`). No role
  is exempt: owners, admins, managers and supervisors count unless the toggle
  excludes them. Every roster and completion figure applies the same filter,
  `REPORTING_MATCH` (`lib/supabase/queries/reporting-rule.ts`). Excluded
  people don't see the report tile in the hero or My Reports in the sidebar;
  `/reports` still opens their history (old links, comment notifications).

- **Writing**: inline in the hero and on My Reports
  (`components/reports/today-report.tsx`, `dynamic-report-form.tsx`). One
  report per person per day (database constraint). Today's report can be
  edited (`updateDailyReport`), only on the same day.
- **Templates**: `report_templates` + `template_fields`; six field types
  (textarea, text, number, select, checkbox, url). Resolution order:
  individual, then first department (by name) with a template, then the org
  default (`resolveTemplate`). Archived templates stay readable for old reports.
- **Answers** live in `daily_reports.field_responses`, keyed by field key.
  Reports edited before Oct 12, 2026 were saved by field id; read answers
  with `fieldResponse()` (`lib/reports/field-response.ts`), never by indexing
  directly.
- **History lists** (My Reports and both employee profile views) all page
  through `getReportsForAuthor`, 10 per page (`REPORT_PAGE_SIZE`), with
  `ReportHistoryPagination`. Day rosters (Track Reports for admins, Team
  Reports for managers/supervisors) show everyone for one date. The home card
  shows the last 5 with a link to My Reports.
- **Reader**: `ReportDetailSheet` with previous/next, comments, edit link for
  your own report today. Lists load their reports' comments with the list
  (`getCommentsForReports`), so the sheet opens with comments in place; the
  hero passes comment counts, neighbours are fetched in the background, and
  fetched comments are kept for the session.
- **Comments**: managers, supervisors and admins comment; the author reads
  their own report's comments (read-only for members). Posting notifies the
  author and logs activity. Authors delete their own; owners and admins delete
  any.
- **Stats** (`lib/helpers/report-stats.ts`, `computeReportStats`): current
  streak skips non-working days and neutral attendance (leave, holiday,
  weekly off), breaks on absence; 30-day submission rate counts only expected
  working days since the person joined (`joinedOn`); a separate tenure rate
  covers the whole time since joining. Both profile views pass the same inputs.

## Attendance and leave

- **Page** (`app/(app)/attendance/page.tsx`): members see their own month
  calendar; managers and supervisors see their own calendar plus a read-only
  team grid without balance/fines columns and without check-in times; owners
  and admins get the full editable grid with balance and fines.
- **Grid** (`components/attendance/attendance-grid.tsx`): status per day,
  popover editor (admins), remote employees marked present from reports,
  holiday and day-off headers, monthly stats card on phones.
- **Leave**: requests are approved/rejected by admins; approving updates both
  ledgers (`profiles.leave_balance` and `leave_balances.total_used`) through
  `adjustLeaveLedgers`. Monthly accrual (+2) runs from pg_cron and can be run
  by hand.
- **Manual adjustments** (`adjustLeaveBalance`): need a reason; saved in
  `leave_balance_adjustments`, shown under Leave balance on the profile (admins
  see all, people see their own), logged as `leave_balance_adjusted` activity
  and sent to the employee as a notification. Managers never see teammates'
  adjustments.
- **Shifts**: full-time / part-time morning / evening, assigned on the
  employee profile; check-in times recorded by admins.

## People and organization

- **Employees** (`/employees`, admins): table and org chart, invite with a
  temporary password, edit, deactivate, archive, restore. Last seen is
  written on page loads (at most every 5 minutes).
- **Employee profile** (`/employees/[id]`): admins get
  `AdminEmployeeProfile` (service role, `requireAdminUser`); managers and
  supervisors get `TeamEmployeeProfile` (RLS decides). Hero, assignments,
  details, leave balance, and report history, which streams in on its own
  (`profile-report-history.tsx`).
- **Departments**: managers, templates, members, completion chart.
- **Team Members** (`/team`): card grid of the people you manage or supervise.
- **Birthdays** (`/birthdays`): list of dates; hourly cron
  `app/api/cron/birthdays` sends one birthday notification per person per day.
- **Organization settings**: time zone, report deadline, working days,
  attendance rules (fines, shifts, leave).

## Notifications and activity

- **Notifications** (`notifications` table, `components/layout/notification-bell.tsx`):
  leave approved/rejected/requested, report commented, template / shift /
  supervisor assigned, invited/onboarded/deactivated/archived, attendance
  fine, birthday, leave balance adjusted. Destinations in
  `lib/notifications/link.ts`. Not built yet: deadline reminders, admin
  alerts for profile edits and manager comments (see backlog).
- **Activity** (`activity_log`, `lib/helpers/activity-log.ts`): every server
  action logs an event. Admins see everything, managers see their
  departments' people (never org settings or other people's leave balances),
  members see events about themselves. Labels in
  `components/analytics/activity-feed.tsx`, icons and second lines in
  `activity-row.tsx`.

## Buddy (mascot)

- Every person is shown as a buddy (`components/mascot`, `lib/mascot`); no
  profile photos. Customised in the buddy dialog (wardrobe).
- Wearables unlock from report stats (`lib/mascot/catalog.ts`): streaks,
  on-time reports, total reports, perfect weeks, tenure, team 100% days,
  birthday, seasons. Checked from the browser once the hero shows
  (`syncMyUnlocks`).
- `lib/mascot` and `components/mascot` have a copy in
  `_handoff/dossier-buddy-kit` (ignored by git) that must stay identical.

## Known gaps (backlog)

Exports (monthly report log, attendance sheet), notification expansions,
announcements in the hero, accent colours tied to the buddy, mobile audit,
tasks system, file storage. See the project backlog for the full list.
