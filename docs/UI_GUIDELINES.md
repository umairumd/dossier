# Dossier — UI Guidelines

## Philosophy

Dossier's UI is designed to be **simple, fast, and professional**. Every interface choice serves the core use case: employees submit reports quickly, managers review them at a glance.

### Core Principles

1. **Mobile-first** — Employees submit on their phones at end of day
2. **Scannable** — Managers need at-a-glance status, not deep dives
3. **Consistent** — Same patterns everywhere reduce cognitive load
4. **Professional** — Clean aesthetic suitable for internal business use
5. **Accessible** — Works with screen readers and keyboard navigation

---

## Navigation

### Structure

Navigation is organized by **business capability**, not by role:

```
Home                    (all roles)
Reports
  Daily Report         (employee, manager, admin)
  Report History       (employee, manager, admin)
  Team Reports         (manager)
  Missing Reports      (manager)
  Analytics            (admin)
People
  Team Members         (manager)
  Employees            (admin)
  Departments          (admin)
Organization
  Invitations          (admin)
  Activity             (admin)
  Settings             (admin)
Settings
  Profile              (all roles)
  Account              (all roles)
```

### Behavior

- Sidebar on desktop (≥768px), collapsible
- Top nav dropdown on mobile
- Current route highlighted with accent color
- Empty sections (no items for role) are hidden

### Implementation

```typescript
// Nav items declare which roles see them
interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: UserRole[];
}

// AppShell filters by role
const sections = navSections
  .map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.includes(profile.role)),
  }))
  .filter(section => section.items.length > 0);
```

---

## Dashboards

### General Rules

1. **Welcome message** — Include user's name and today's date
2. **Role badge** — Show department name for context
3. **Summary stats first** — Most important numbers at the top
4. **Progressive disclosure** — Overview → link to detail pages
5. **Parallel data loading** — Use `Promise.all()` for concurrent fetches

### Employee Dashboard

```
Welcome back, {name}
{date} · {department}

┌─────────────────┐ ┌─────────────────┐
│ Today's Status  │ │ Submit Report   │
│ ✓ Submitted     │ │ [Already done]  │
└─────────────────┘ └─────────────────┘

┌─────────────────┐ ┌─────────────────┐
│ Current Streak  │ │ Monthly Rate    │
│ 5 days          │ │ 87%             │
└─────────────────┘ └─────────────────┘

Recent Reports
├─ Aug 1 - Worked on...
├─ Jul 31 - Fixed bug...
└─ [View All →]
```

### Manager Dashboard

```
{department} Dashboard
{date} · {department}

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Team    │ │Submitted│ │Missing │ │Late    │
│12      │ │10       │ │2       │ │1       │
└────────┘ └────────┘ └────────┘ └────────┘

Team Completion Trend [7-day chart]

Highlights
├─ Longest Streaks: Alice (15), Bob (12)
└─ Frequently Missing: Carol (60%)

Recent Activity
└─ [list of submissions]
```

### Admin Dashboard

```
Organization Overview

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Employees│ │Managers│ │Depts   │ │Pending │
│45       │ │5       │ │5       │ │3       │
└────────┘ └────────┘ └────────┘ └────────┘

Recent Activity
└─ [invites, archives, reports]

Quick Actions
├─ [Invite Employee]
└─ [Create Department]
```

---

## Forms

### Layout

- Single column on mobile
- Labels above inputs (not inline)
- Required fields marked with asterisk (*)
- Help text below input when needed
- Error messages in red below the field

### Validation

- Client-side validation for immediate feedback
- Server-side re-validation as source of truth
- Field-level errors displayed inline
- Form-level errors displayed at top

### Buttons

- Primary action on the right
- Cancel/secondary on the left
- Disabled state while submitting
- Loading spinner in button during submission

### Example: Report Form

```
Accomplishments *
┌─────────────────────────────────────────┐
│ What did you work on today?             │
│                                         │
│                                         │
└─────────────────────────────────────────┘

Blockers
┌─────────────────────────────────────────┐
│ Any blockers? (optional)                │
│                                         │
└─────────────────────────────────────────┘

Tomorrow's Plan
┌─────────────────────────────────────────┐
│ What's next? (optional)                 │
│                                         │
└─────────────────────────────────────────┘

                              [Submit Report]
```

---

## Tables

### Structure

- Header row with column names
- Sortable columns where applicable
- Actions in the last column
- Responsive: stack to cards on mobile

### Row Actions

- Use dropdown menu for multiple actions
- Most common action can be a direct button
- Destructive actions in red
- Confirm destructive actions with dialog

### Status Badges

| Status | Color | Use Case |
|--------|-------|----------|
| Active | Green | Active employees, On Time reports |
| Pending | Yellow | Pending invitations |
| Invited | Blue | Fresh invitations |
| Late | Orange | Late submissions |
| Disabled | Gray | Deactivated accounts |
| Archived | Red | Archived employees |
| Missed | Red | Missing reports |

### Empty State

When a table has no data:

```
┌─────────────────────────────────────────┐
│                                         │
│         No employees yet.               │
│    Invite someone to get started.       │
│                                         │
│         [Invite Employee]               │
│                                         │
└─────────────────────────────────────────┘
```

---

## Dialogs & Sheets

### Sheets (Side Panels)

Used for:
- Creating/editing entities
- Viewing details without leaving context
- Multi-step forms

Behavior:
- Slide in from the right
- Click outside or X to close
- ESC key to close

### Alert Dialogs

Used for:
- Confirming destructive actions
- Important warnings

Structure:
```
┌─────────────────────────────────────────┐
│ Archive Employee?                       │
├─────────────────────────────────────────┤
│ Are you sure you want to archive        │
│ John Doe? They won't be able to sign    │
│ in until restored.                      │
├─────────────────────────────────────────┤
│ [Cancel]                     [Archive]  │
└─────────────────────────────────────────┘
```

Rules:
- Title is the action (verb)
- Description explains consequences
- Cancel on left, confirm on right
- Destructive confirm button in red

---

## Colour

Use the surface roles, never ad-hoc opacities: `bg-background` (page), `bg-card` + `surface-card` (cards), `bg-popover` / `surface-overlay` (menus, dialogs), `bg-fill-subtle` (tiles, fields, notices inside cards), `bg-fill-hover` / `bg-fill-active` (hover and selected), `border-line` / `divide-line` (dividers), `border-edge` / `ring-edge` (outlines), `border-line-strong` (emphasis). See docs/design/PLAN.md "Colour".

## Cards

### Key figures

Key numbers sit in one `FigureStrip` (components/shared/figure-strip.tsx), not a card per number:

```
┌──────────────┬──────────────┬──────────────┐
│ Current streak│ Submission rate│ Last report │
│ 5 days        │ 92%           │ Yesterday    │
└──────────────┴──────────────┴──────────────┘
```

- Label 13px muted (optional icon), value 24/600 tabular, optional unit and hint
- `variant="inset"` when the strip sits inside another card
- Stacks with dividers on phones

### Signed-out screens

Sign in, password reset, first sign-in and account states use `AuthCard` (components/auth/auth-card.tsx) under the logo from the `(auth)` layout. Errors and messages use `AuthNotice`; the secondary link goes in `footer`, under the card.

### Content Cards

Used for grouped information:

```
┌─────────────────────────────────────────┐
│ Recent Activity                         │
│ Invitations, reports, and archives      │
├─────────────────────────────────────────┤
│ • Alice submitted a report              │
│ • Bob was invited                       │
│ • Carol was archived                    │
└─────────────────────────────────────────┘
```

- Title in card header
- Optional description
- Content in card body

---

## Analytics

### Trend Charts

- 7-day or 30-day completion trends
- Bar or line chart
- X-axis: dates
- Y-axis: percentage (0-100%)
- Tooltip with exact value on hover

### Empty State

```
No data for this period.
Reports submitted in the last 7 days will appear here.
```

### Leaderboards

```
Longest Streaks
1. Alice - 15 days
2. Bob - 12 days
3. Carol - 8 days
```

- Ranked list (top 3)
- Name clickable to detail view
- Metric aligned right

---

## Actions & Buttons

### Button Hierarchy

| Type | Use Case | Style |
|------|----------|-------|
| Primary | Main action | Filled, accent color |
| Secondary | Alternative action | Outlined |
| Ghost | Subtle action | No border |
| Destructive | Delete, archive | Red |
| Link | Navigation | Underlined text |

### Button States

- **Default** — Normal appearance
- **Hover** — Slightly darker/lighter
- **Active** — Pressed state
- **Disabled** — Grayed out, cursor not-allowed
- **Loading** — Spinner replaces text

### Action Menus

For rows with multiple actions:

```
[•••] →  Edit
         Deactivate
         ────────────
         Archive
```

- Most common actions first
- Destructive actions after separator
- Use icons for clarity

---

## Toast Messages

### When to Use

- Successful actions ("Report submitted")
- Errors that need attention ("Failed to save")
- Information ("Reminder sent")

### Not for

- Form validation errors (show inline)
- Permanent messages (use cards)
- Complex information (use dialogs)

### Types

| Type | Use Case | Example |
|------|----------|---------|
| Success | Action completed | "Employee invited successfully" |
| Error | Action failed | "Failed to archive department" |
| Info | Neutral information | "Reminders aren't set up yet" |
| Warning | Caution needed | "This will archive all reports" |

### Behavior

- Appear bottom-right
- Auto-dismiss after 5 seconds
- Can be manually dismissed
- Stack if multiple

---

## Empty States

Every list/table needs an empty state:

| Context | Message | Action |
|---------|---------|--------|
| No employees | "No employees yet" | Invite Employee |
| No departments | "No departments yet" | Create Department |
| No reports | "No reports submitted" | — |
| No team members | "No team members assigned" | — |

### Structure

```
[Icon or illustration]

{Main message}
{Helpful description}

[Optional action button]
```

---

## Loading States

### Page Loading

- Show skeleton loaders matching content layout
- Keep header/nav visible
- Don't flash loading state (minimum display time)

### Button Loading

- Replace text with spinner
- Keep button width stable
- Disable button during load

### Inline Loading

- Use spinner for small areas
- Gray out content being refreshed

---

## Error Handling

### Form Errors

- Show inline below the field
- Red text, small size
- Clear when user starts typing

### Action Errors

- Show toast for transient errors
- Show inline message for persistent errors
- Include retry option when applicable

### Page Errors

```
┌─────────────────────────────────────────┐
│                                         │
│         Something went wrong.           │
│    We couldn't load this page.          │
│                                         │
│           [Try Again]                   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Confirmation Dialogs

### When Required

- Deactivating accounts
- Archiving employees/departments
- Permanent deletion
- Any irreversible action

### Structure

1. **Title** — Action being taken
2. **Description** — What will happen
3. **Cancel** — Safe exit (left)
4. **Confirm** — Executes action (right)

### Destructive Confirmation

For permanent delete, require typing:

```
Type "DELETE" to confirm:
┌─────────────────────────────────────────┐
│                                         │
└─────────────────────────────────────────┘

[Cancel]                          [Delete]
```

---

## Accessibility

### Requirements

1. **Keyboard navigation** — All interactive elements focusable
2. **Screen reader support** — Proper ARIA labels
3. **Color contrast** — WCAG AA minimum
4. **Focus indicators** — Visible focus rings
5. **Error announcements** — Live regions for errors

### Implementation

- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Add `aria-label` to icon-only buttons
- Include `role` attributes where needed
- Test with keyboard-only navigation

---

## Consistency Rules

### Spacing

- Use Tailwind spacing scale (4, 8, 12, 16, 24, 32, 48)
- Consistent gaps: `gap-4` (16px) between cards, `gap-6` (24px) between sections

### Typography

- Page titles: `text-2xl font-semibold tracking-tight`
- Card titles: `text-lg font-semibold`
- Body text: `text-sm`
- Muted text: `text-muted-foreground`

### Colors

- Use CSS variables from theme (`--foreground`, `--muted`, `--accent`)
- Status colors: green (success), red (error/destructive), yellow (warning), blue (info)
- Never hardcode colors

### Icons

- Use Lucide icons consistently
- Size: `size-4` for inline, `size-5` for standalone
- Match icon to action (Trash for delete, Edit for edit, etc.)

---

## Tiles and in-place views

### Tile anatomy

- Eyebrow label: 11px, uppercase, tracking, muted.
- Optional aside on the eyebrow line: muted, or amber for a deadline warning.
- Body, then an optional actions row at the bottom.
- Padding 18px on desktop, 16px on a phone.
- `rounded-xl`, `border-foreground/10`, and the subtle `bg-foreground/[0.03]` surface.
- Use `Tile`, `TileHeader`, `TileBody`, and `TileActions` from `components/ui/tile.tsx`.

### Actions inside a tile

- At most one primary (filled) button, and only for the tile's main task: Write report, Continue report, Wear it, Submit report.
- Everything else is an outline button, size sm: 36px tall, 44px on a phone. `TileActions` applies that height.
- Actions sit in one row, left-aligned at the bottom, or right-aligned when they share a line with content.
- A tile's secondary, navigational action ("View progress", "Wardrobe") is a `TileFooterAction`: a full-width footer row with a top divider, the label on the left and a chevron-right on the right, flush with the tile's bottom edge. Neighbouring tiles' footers line up. One footer action per tile.
- No free-floating text links with arrows inside tiles; use `TileFooterAction` instead.
- Icons only for expand or collapse (chevrons), the footer action's chevron-right, and close (X).
- Segmented tabs (`components/ui/tabs.tsx`): a visible track (foreground/5 with a 1px inner ring) and a raised active segment; never an unstyled row of buttons.

### In-place views

- One shared header, `HeroViewHeader`, with the outline Collapse button on the right.
- Escape closes.
- Focus moves into the view on open and back to the opener on close.

### Progress

- One `Meter` (`components/ui/meter.tsx`): 4px tall, rounded, track at foreground 8%, fill at foreground 70%.
- Amber in warning states. Green only for success.

### Colour

- Amber means a deadline or something that needs attention.
- Green means success or done.
- Red means an error.
- Never decorative.
- Status pills use the tinted `Badge` variants.

### Buddy faces

- 20px inline, 32px in a list row, 48px in a feature row, 112px in the hero.
- `MascotStatic` outside the hero. The hero is the live buddy.

### Inputs with an addon

- The addon uses the same horizontal padding as the field (`px-3`), and is vertically centered.
- The group's divider separates the addon from the field, with space on both sides.
- The text field keeps a minimum width of 6rem (`min-w-24`).

### Numbers

- `tabular-nums` in lists and on axes.
- Proportional figures for big numbers.

## Home cards

Cards on the home page follow the hero tiles:

- Header: `CardLabelHeader` (small caps label left, quiet note or control right). Not `CardTitle` + `CardDescription`.
- Main link: `CardFooterLink` (full-width row with a chevron along the bottom), not a "View all" text link in the header or body.
- People rows: buddy face (`MemberAvatar size="sm"`), name, designation in muted text, value right-aligned and `tabular-nums`.
- Status colour only when it means something: neutral before the deadline, amber once it has passed or a value is below its threshold, green when complete.
- Activity rows (home card and Activity page share `ActivityRowShell` in `components/analytics/activity-row.tsx`): an icon chip for the event's scenario (`EVENT_ICON`), faintly tinted by its kind (`CATEGORY_TONE`: reports green, people blue, attendance and leave amber, departments and templates violet, settings grey); the sentence with the actor in medium weight ("You" for the viewer); an optional muted detail line (comment preview, leave type and date); the clock time. Text stays neutral; colour lives only in the chip.
- Team and company feeds fold each day's report submissions into one row: a summary on the home page, expandable on the Activity page.

## App frame

- Desktop: the sidebar sits on the app frame (`bg-shell`); the page is a raised panel (`data-app-panel`, rounded, 10% border) that scrolls on its own. Anything that needs the scroll position should use the panel, not `window` (scroll events: listen with `capture: true` on `window`).
- Sidebar items: 36px high, `rounded-lg`, neutral active fill (`bg-foreground/[0.07]` with a faint inset ring), no sideways motion on hover. Section labels use `label-eyebrow`.

## Report reader

- One reader for every place a report is read (`ReportDetailSheet`). Body is `ReportFields`: template order; long text as paragraphs; two or more consecutive numbers as a figure strip; other short answers as a facts list (label left, answer right); links as a chip with the site name; unanswered fields hidden.

## Pages

- Page header: `PageHeader` with the title, one muted line of useful numbers (`description`, joined with " · "), and actions or `DateNav` on the right.
- Lists: `DataList` (components/shared/data-list.tsx). One card per list, column header once, `DataListSection` rows for groups (departments), `DataListRow` makes the whole row open the item (links inside need `relative z-10`), `PersonCell` for buddy + name + designation, `DataListChevron` at the end. Inside a Card use `variant="bare"`. On phones a row shows its first two cells; hide the rest with `hidden md:block`.
- Status: `SubmissionStatusBadge` tints (green on time, amber late, red missed, grey pending/leave/off).
- Filters with a handful of values: `SegmentedFilter` with counts, next to the search field. Dropdowns only for long option lists.
- Report lists: `ReportRoster` (who submitted on a date) and `ReportHistoryList` (a person's reports).
- People cards: `PersonCard` (components/shared/person-card.tsx) with `PersonCardStats` or a one-line footer; `GroupHeading` ("October · 4") above each group. No uppercase labels.
- Forms: `SettingsSection` (components/shared/settings-section.tsx): title and explanation on the left, `Field`s on the right, `SaveBar` at the bottom (Save is enabled only when something changed; Cancel appears with changes). Choices from a short list are chips or a select, never a bare number box.
