# Inoma Hub — Product Specification

## Vision

Inoma Hub is an internal operations platform for Inoma Digital, designed to create a **daily accountability loop** between employees, managers, and leadership.

The core insight: accountability is a daily habit, not a weekly meeting. When employees record what they accomplished each day and managers review it the same day, problems surface early, momentum is visible, and follow-ups happen automatically.

---

## Problem Being Solved

**Before Inoma Hub:**
- Managers asked "what did you work on?" via Slack, email, or standups
- Answers were inconsistent, easily forgotten, or scattered across channels
- Founders had no visibility into day-to-day work without attending meetings
- No historical record made performance discussions subjective

**After Inoma Hub:**
- Every employee submits a structured end-of-day report
- Managers see completion status at a glance
- Founders have org-wide visibility without meetings
- Permanent history enables objective performance context

---

## Target Users

| Role | Primary Job | Inoma Hub Value |
|------|-------------|-----------------|
| **Employee** | Submit daily report | Quick, mobile-friendly way to record accomplishments |
| **Manager** | Review team's work | Dashboard shows who submitted, who's missing, completion trends |
| **Admin** | Manage organization | Invite people, create departments, configure settings |

---

## Product Philosophy

### 1. Simplicity Over Features
One job done well beats ten jobs done poorly. The MVP solves exactly one problem: daily reporting.

### 2. Mobile-First UX
Employees submit reports on their phones at the end of the day. Forms must be thumb-friendly.

### 3. Immutable History
Reports cannot be edited or deleted. This preserves accountability and prevents gaming.

### 4. Database as Truth
Authorization happens in Postgres via RLS, not just in application code. If the database allows it, it's allowed.

### 5. No Magic Numbers
Completion percentages, streaks, and deadlines are computed consistently everywhere from shared code.

---

## Current MVP Scope (v0.9.0 — RC1)

### Authentication & Access
- Invitation-only accounts (no public sign-up)
- Email/password login
- Self-service password change
- Capability-based navigation scoped by role

### Employee Features
- Daily report submission (Accomplishments, Blockers, Tomorrow's Plan)
- Report history view
- Current streak display
- 30-day completion percentage
- Profile settings (change name)

### Manager Features
- Team dashboard (completion today, missing, late, trends)
- Date-filterable team report browser
- On Time / Late / Missed status badges
- Missing reports view with "days since last submission"
- Read-only team member list
- Per-employee overview

### Admin Features
- Organization overview dashboard
- Employee management (invite, edit, activate/deactivate, archive/restore, permanently delete)
- Department management (create, edit, archive/restore, permanently delete, assign manager)
- Organization-wide analytics (7-day and 30-day trends)
- Invitation tracking
- Activity feed
- Organization settings (report deadline hour, UTC)

---

## Features Intentionally Excluded

These are **not in scope** for the MVP and will not be built until the core is proven:

| Feature | Reason |
|---------|--------|
| Project management | Different product, different audience |
| HR system | Scope creep, regulatory complexity |
| Payroll | Requires integrations, compliance |
| AI summaries | Adds complexity, unclear value |
| Leave management | Separate workflow |
| Real-time notifications | Activity feeds exist; push/email do not |
| Configurable report templates | Architecture is prepared (`lib/reports/fields.ts`), but no admin UI |

---

## Future Roadmap

### Near-Term (Next 3 Months)
1. **Production stabilization** — Tests, monitoring, error tracking
2. **Timezone-aware deadlines** — Org-level IANA timezone setting
3. **Manager/admin reporting UX** — Allow managers/admins to submit reports via nav

### Medium-Term (3–6 Months)
4. **Configurable report templates** — Admin defines fields per department or org-wide
5. **Email notifications** — Daily reminder for non-submitters
6. **Attendance tracking** — Check-in/check-out, overtime

### Long-Term (6–12 Months)
7. **Task management** — Simple task list per employee
8. **HR module** — Leave requests, holidays, contracts
9. **Document management** — Policies, onboarding docs
10. **Organization analytics** — Deep insights, trends, exports

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Daily completion rate | > 85% of employees submit on time |
| Manager check-in frequency | Managers review dashboard daily |
| Time to submit | < 3 minutes per report |
| System uptime | 99.9% availability |

---

## Guiding Questions for Future Decisions

When evaluating a new feature, ask:

1. Does it strengthen the daily accountability loop?
2. Can it be done with the existing role model (Employee/Manager/Admin)?
3. Does it require new database tables or can it extend existing ones?
4. Will managers actually look at this daily?
5. Is it simpler than the alternative?

If the answer to all five is yes, it belongs in Inoma Hub. Otherwise, it's a separate product.
