# Inoma Hub — Product Roadmap

## Current Status

**Version:** 0.9.0 (Release Candidate 1)  
**Stage:** MVP feature-complete, entering stabilization

---

## Phase 1: Stabilization

**Purpose:** Production-ready reliability and maintainability

### Features

- [ ] Add automated test suite (Vitest)
  - Validation functions
  - Status computation logic
  - Server Action guards (last admin, self-protection)
- [ ] Generate and use Supabase TypeScript types
- [ ] Add error tracking (Sentry or similar)
- [ ] Add structured logging for server actions
- [ ] Set up CI pipeline (GitHub Actions)
  - TypeScript check
  - Linting
  - Tests
  - Production build
- [ ] Clean up empty scaffolding directories
- [ ] Add health check endpoint
- [ ] Document deployment runbook

### Dependencies

None — can begin immediately

### Risks

- Test coverage takes time to build up
- May discover edge cases during testing

### Estimated Complexity

**Medium** — Mostly infrastructure work, not feature development

---

## Phase 2: Product Polish

**Purpose:** UX improvements and timezone handling

### Features

- [ ] Timezone-aware reporting
  - Add `timezone` column to `organization_settings`
  - Store IANA timezone (e.g., "America/New_York")
  - Compute `report_date` and deadline in org timezone
  - Display times in user's local timezone
- [ ] Manager/admin report submission
  - Add Daily Report to manager/admin nav
  - Same action, just expose in UI
  - Decide: are managers counted in completion %?
- [ ] Improve activity feeds
  - Add more event types (deactivation, role changes)
  - Consider persisted audit log table
- [ ] Remove or replace "Send Reminder" stub
  - Either implement or remove the button
- [ ] Add bulk operations for admin
  - Select multiple employees for deactivation
  - Bulk department reassignment

### Dependencies

- Phase 1 (tests catch regressions during refactoring)

### Risks

- Timezone logic is notoriously tricky
- Changing `report_date` computation may affect historical data

### Estimated Complexity

**Medium-High** — Timezone work is deceptively complex

---

## Phase 3: Configurable Report Templates

**Purpose:** Let admins customize report fields per department or org-wide

### Features

- [ ] Create `report_templates` table
  - Name, fields (JSONB), department_id (nullable for org-wide)
- [ ] Migrate existing reports to use template
  - Seed default template with current fields
- [ ] Admin UI for template management
  - Create/edit templates
  - Assign to departments
  - Preview fields
- [ ] Dynamic report form
  - Render fields from template
  - Support field types: text, textarea, checkbox, select
- [ ] Dynamic report display
  - Render stored field values
  - Handle old reports with legacy schema

### Dependencies

- Phase 2 (stable foundation)

### Risks

- Schema migration complexity
- Backward compatibility with existing reports
- UI complexity for non-technical admins

### Estimated Complexity

**High** — Significant database and UI changes

---

## Phase 4: Attendance

**Purpose:** Track employee check-in/check-out times

### Features

- [ ] Create `attendance` table
  - employee_id, date, check_in, check_out, duration
- [ ] Check-in/out UI for employees
  - Clock in button
  - Clock out button
  - Status indicator
- [ ] Manager attendance view
  - Today's attendance by team member
  - Late arrivals, early departures
- [ ] Admin attendance reports
  - Organization-wide attendance stats
  - Export capabilities
- [ ] Overtime tracking
  - Calculate hours beyond standard
  - Flag for review

### Dependencies

- Phase 2 (timezone handling for accurate times)

### Risks

- Time tracking is legally sensitive in some jurisdictions
- May need location/IP verification
- Integration with payroll systems later

### Estimated Complexity

**Medium** — New domain, but straightforward schema

---

## Phase 5: Task Management

**Purpose:** Simple task tracking per employee

### Features

- [ ] Create `tasks` table
  - title, description, status, due_date, assigned_to, created_by
- [ ] Employee task list
  - View assigned tasks
  - Mark complete
  - Add to daily report
- [ ] Manager task assignment
  - Create tasks for team members
  - Track completion
  - Link tasks to reports
- [ ] Task metrics
  - Tasks completed this week
  - Overdue tasks

### Dependencies

- None strict, but ideally after Phase 3 (reports can reference tasks)

### Risks

- Scope creep into full project management
- Need clear boundaries vs. dedicated PM tools

### Estimated Complexity

**Medium** — Keep it simple, resist feature creep

---

## Phase 6: Notifications

**Purpose:** Proactive reminders and alerts

### Features

- [ ] Email infrastructure setup
  - Configure Supabase email or external provider
  - Email templates
- [ ] Daily report reminders
  - Email non-submitters at configurable time
  - Respect timezone settings
- [ ] Manager alerts
  - Missing report notifications
  - Team completion summary
- [ ] Admin alerts
  - Low completion rate warnings
  - New employee onboarding reminders
- [ ] Notification preferences
  - Per-user opt-out
  - Channel preferences (email, in-app)

### Dependencies

- Phase 2 (timezone-aware scheduling)

### Risks

- Email deliverability issues
- Notification fatigue
- Unsubscribe compliance

### Estimated Complexity

**Medium-High** — Infrastructure + scheduling complexity

---

## Phase 7: HR Module

**Purpose:** Basic HR functionality beyond reporting

### Features

- [ ] Leave management
  - Request leave
  - Manager approval
  - Leave balance tracking
  - Calendar view
- [ ] Employee profiles extended
  - Start date, title, manager chain
  - Emergency contact
  - Basic personal info
- [ ] Holidays
  - Organization holiday calendar
  - Auto-exclude from completion calculations
- [ ] Onboarding checklists
  - New employee tasks
  - Progress tracking

### Dependencies

- Phase 4 (attendance + leave relate)
- Phase 6 (notifications for approvals)

### Risks

- HR data has privacy implications
- Regional variations in leave policies
- May need role expansion (HR Manager)

### Estimated Complexity

**High** — New domain with regulatory considerations

---

## Phase 8: Documents

**Purpose:** Central document repository

### Features

- [ ] Document storage
  - File upload (policies, handbooks)
  - Folder organization
  - Version history
- [ ] Access control
  - Department-specific documents
  - Role-based visibility
- [ ] Employee documents
  - Contracts, certifications
  - Expiry tracking
- [ ] Acknowledgments
  - Track who read required documents
  - Compliance reporting

### Dependencies

- Storage solution (Supabase Storage or S3)

### Risks

- Storage costs
- File type security
- Search functionality complexity

### Estimated Complexity

**Medium-High** — Infrastructure + UI for file management

---

## Phase 9: Organization Analytics

**Purpose:** Deep insights into organizational performance

### Features

- [ ] Advanced dashboards
  - Department comparisons
  - Historical trends (months, quarters)
  - Predictive indicators
- [ ] Custom reports
  - Report builder for admins
  - Export to CSV/PDF
  - Scheduled report delivery
- [ ] Employee performance metrics
  - Aggregate report quality scores
  - Attendance patterns
  - Task completion rates
- [ ] Org health indicators
  - Engagement scores
  - Retention risk signals

### Dependencies

- Phases 1-6 (need data from all systems)

### Risks

- Data quality issues compound
- May need data warehouse approach
- Privacy concerns with performance metrics

### Estimated Complexity

**High** — Analytics platform within the app

---

## Summary Timeline

| Phase | Focus | Complexity | Dependencies |
|-------|-------|------------|--------------|
| 1 | Stabilization | Medium | None |
| 2 | Polish + Timezone | Medium-High | Phase 1 |
| 3 | Report Templates | High | Phase 2 |
| 4 | Attendance | Medium | Phase 2 |
| 5 | Task Management | Medium | None |
| 6 | Notifications | Medium-High | Phase 2 |
| 7 | HR Module | High | Phases 4, 6 |
| 8 | Documents | Medium-High | Storage infra |
| 9 | Org Analytics | High | Phases 1-6 |

---

## Decision Points

### After Phase 1
- Is the MVP validated with real users?
- What feedback is most urgent?

### After Phase 3
- Are report templates solving a real problem?
- What's the adoption rate?

### After Phase 6
- Is email notification effective or annoying?
- What notification channels do users want?

### Before Phase 7
- Is Inoma Hub the right place for HR?
- Should this be a separate product?
