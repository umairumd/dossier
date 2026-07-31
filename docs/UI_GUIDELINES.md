# Inoma Hub — UI Guidelines

## Philosophy

Inoma Hub's UI is designed to be **simple, fast, and professional**. Every interface choice serves the core use case: employees submit reports quickly, managers review them at a glance.

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
  Daily Report         (employee)
  Report History       (employee)
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

## Cards

### Stat Cards

Used on dashboards for key metrics:

```
┌─────────────────────┐
│ Current Streak      │
│ 5 days              │
└─────────────────────┘
```

- Label in muted text
- Value large and bold
- Optional unit suffix

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
