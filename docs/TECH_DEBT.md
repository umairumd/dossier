# Dossier — Technical Debt

## Overview

This document catalogs known technical debt, prioritized by impact and effort. Items are categorized as **Critical**, **High**, **Medium**, or **Low** priority.

---

## Critical

### 1. No Automated Tests

**Description:**  
No test suite exists. No unit tests, integration tests, or E2E tests.

**Impact:**
- Regressions go undetected until production
- Refactoring is risky
- New developers have no safety net

**Location:**  
Entire codebase

**Recommendation:**
1. Add Vitest for unit tests
2. Test pure functions first (validation, status computation)
3. Add integration tests for server actions
4. Add Playwright for critical E2E flows

**Effort:** High (ongoing)

---

### 2. No Generated Database Types

**Description:**  
Query results use manual TypeScript interfaces and `as unknown as Type` casts. Supabase can generate types from the schema, but this isn't set up.

**Impact:**
- Type mismatches between schema and code go undetected
- Embed relations require verbose casts
- Column renames don't cause compile errors

**Location:**
- `lib/supabase/queries/*`
- `types/*.ts`

**Recommendation:**
```bash
supabase gen types typescript --local > lib/database.types.ts
```
Then update queries to use generated types.

**Effort:** Medium (setup + migration)

---

## High

### 3. `is_active` vs Auth Ban Can Diverge

**Description:**  
Deactivation/archive actions update Auth ban_duration and `profiles.is_active` sequentially. If the second update fails, they're out of sync.

**Impact:**
- User may be banned in Auth but `is_active = true`
- Or vice versa: `is_active = false` but not actually banned

**Location:**  
`lib/actions/admin/employees.ts` — `setEmployeeActive`, `archiveEmployee`

**Recommendation:**
- Either use a compensating action (rollback on failure)
- Or consider the ban as source of truth and derive `is_active` from it
- Add monitoring for divergence

**Effort:** Medium

---

### 4. No `requireManagerUser()` Guard

**Description:**  
Admin actions use `requireAdminUser()` before any service-role operations. Manager queries rely solely on RLS — there's no equivalent `requireManagerUser()`.

**Impact:**
- If a manager query ever uses service-role client, there's no guard
- Less defense-in-depth than admin pattern

**Location:**  
`lib/supabase/queries/manager/*`

**Recommendation:**
- Create `requireRole(role: UserRole)` utility
- Apply to manager queries for consistency
- Document that RLS remains the primary boundary

**Effort:** Low

---

### 5. UTC-Only Timezone

**Description:**  
`report_date` and deadline are evaluated in UTC. An organization in a non-UTC timezone sees unintuitive behavior.

**Impact:**
- SF employee submitting at 6pm local may be marked "late" if UTC deadline is 5pm (10am SF time)
- "Today" may flip to "tomorrow" at odd local times

**Location:**
- `lib/helpers/dates.ts` — `todayDateString()`
- `lib/reports/submission-status.ts` — `getSubmissionStatus()`
- `organization_settings.report_deadline_hour_utc`

**Recommendation:**
- Add `timezone` column to `organization_settings`
- Compute `report_date` in org timezone
- Display times in user's local timezone

**Effort:** High (affects multiple systems)

---

### 6. Admin Employee List Pages All Auth Users

**Description:**  
`getAllEmployees()` calls `listUsers()` with pagination, walking all pages every time. This works for small orgs but degrades as headcount grows.

**Impact:**
- Slow page loads for large orgs
- Unnecessary Auth API calls
- Rate limit risk

**Location:**  
`lib/supabase/queries/admin/employees.ts` — `loadAuthUsersById()`

**Recommendation:**
- Cache or denormalize email/invited_at/last_sign_in onto `profiles` via webhook
- Or use Supabase realtime to keep in sync
- Or accept the tradeoff for small org MVP

**Effort:** Medium-High

---

## Medium

### 7. Duplicate `todayDateString()` Definition

**Description:**  
`submitDailyReport` in `lib/actions/reports.ts` defines a local `todayDateString()` instead of importing from `lib/helpers/dates.ts`.

**Impact:**
- Potential for drift if implementations differ
- Violates DRY principle

**Location:**
- `lib/actions/reports.ts` (local definition)
- `lib/helpers/dates.ts` (canonical)

**Recommendation:**
- Remove local definition
- Import from `lib/helpers/dates.ts`

**Effort:** Trivial

---

### 8. Empty Scaffolding Directories

**Description:**  
Several directories exist but are empty:
- `hooks/`
- `services/`
- `utils/`
- `lib/constants/`

**Impact:**
- Confuses new developers
- Suggests incomplete setup
- Structure doesn't match reality

**Location:**  
Project root

**Recommendation:**
- Delete empty directories
- Or populate with README explaining intended use

**Effort:** Trivial

---

### 9. Activity Feeds Are Derived, Not Persisted

**Description:**  
Activity feeds are computed from timestamps on existing rows (invited_at, archived_at, submitted_at). There's no dedicated audit log.

**Impact:**
- Not all events are captured (deactivation, role changes, deadline updates)
- "Department created" never ages out except via slice limit
- No compliance audit trail

**Location:**  
`lib/supabase/queries/admin/activity.ts`

**Recommendation:**
- Create `activity_events` table
- Write events from server actions
- Index by timestamp for efficient queries

**Effort:** Medium

---

### 10. Invite Expiry Assumed at 24h

**Description:**  
`computeEmployeeStatus()` assumes invites expire after 24 hours. This is Supabase's default but not read from project config.

**Impact:**
- "Pending" vs "Invited" status may be wrong if project config differs

**Location:**  
`lib/supabase/queries/admin/employees.ts` — `INVITE_EXPIRY_MS`

**Recommendation:**
- Document the assumption
- Or read from Supabase config if possible
- Or accept as "good enough" for MVP

**Effort:** Low

---

### 11. No Structured Logging

**Description:**  
Errors are logged with `console.error()`. No structured logging format, no error tracking service.

**Impact:**
- Hard to debug production issues
- No alerting on errors
- Logs lost when container restarts

**Location:**  
Various `catch` blocks and error handlers

**Recommendation:**
- Add Sentry or similar for error tracking
- Use structured JSON logging
- Include request context (user, action, params)

**Effort:** Medium

---

### 12. PostgREST Embed Hints Required

**Description:**  
Dual FKs between `profiles` and `departments` require explicit `!constraint` hints in Supabase queries.

**Impact:**
- Verbose query syntax
- Easy to forget and get PGRST201 errors
- Type casts needed without generated types

**Location:**  
Any query joining profiles↔departments

**Recommendation:**
- Document the pattern
- Generated types would help
- Consider if schema could avoid this (unlikely without restructure)

**Effort:** Documentation only

---

### 13. No CI Pipeline

**Description:**  
No GitHub Actions or other CI workflow. Quality checks are manual.

**Impact:**
- Bad commits can reach main
- No automated validation on PRs

**Location:**  
`.github/workflows/` (doesn't exist)

**Recommendation:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint .
      - run: npm run build
```

**Effort:** Low

---

## Low

### 14. Managers/Admins Have No Report Submission UI

**Description:**  
RLS allows managers and admins to submit their own reports, but the nav doesn't include Daily Report for these roles.

**Impact:**
- Working managers who need to report can't do so easily
- Must navigate directly to `/reports` or have a separate employee account

**Location:**  
`components/layout/nav-config.tsx`

**Recommendation:**
- Add Daily Report + Report History to manager/admin nav
- Decide if managers count in team completion denominator

**Effort:** Low

---

### 15. No Monitoring/Observability

**Description:**  
No APM, no metrics, no health checks beyond what Vercel provides.

**Impact:**
- Slow queries go undetected
- No visibility into production performance
- Can't set up alerts

**Location:**  
Infrastructure

**Recommendation:**
- Add health check endpoint
- Consider Vercel Analytics or similar
- Add Supabase performance monitoring

**Effort:** Medium

---

## Summary by Priority

| Priority | Count | Key Items |
|----------|-------|-----------|
| Critical | 2 | No tests, no DB types |
| High | 4 | Auth/profile sync, no manager guard, UTC timezone, Auth API paging |
| Medium | 6 | Duplicate code, empty dirs, derived feeds, invite expiry, no logging, PostgREST hints |
| Low | 2 | Manager nav, monitoring |

---

## Recommended Order

1. **Add tests** (Critical) — Safety net for everything else
2. **Generate DB types** (Critical) — Catch schema drift
3. **Fix duplicate todayDateString** (Medium) — Quick win
4. **Add CI pipeline** (Medium) — Automated quality gates
5. **Clean up empty directories** (Medium) — Quick win
6. **Add error tracking** (Medium) — Production visibility
7. **Add `requireRole()` utility** (High) — Defense in depth
8. **Address timezone** (High) — UX improvement, complex
9. **Create audit log table** (Medium) — Better activity feeds
10. **Optimize Auth user loading** (High) — Performance at scale
