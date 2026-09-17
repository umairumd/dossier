# Dossier — Test Plan

## Overview

This document outlines a comprehensive testing strategy for Dossier. Currently, no automated tests exist. This plan covers manual QA, recommended unit tests, integration tests, and E2E tests.

---

## Current State

- **Automated Tests:** None
- **Test Framework:** Not installed
- **CI Pipeline:** Not configured
- **QA Process:** Manual

---

## Testing Strategy

### Layers

1. **Unit Tests** — Pure functions, validation, computation
2. **Integration Tests** — Server actions with mocked Supabase
3. **E2E Tests** — Critical user flows with real browser
4. **Manual QA** — UX, edge cases, visual regression

### Recommended Tools

- **Vitest** — Unit and integration tests
- **Testing Library** — Component testing
- **MSW** — Mock Service Worker for API mocking
- **Playwright** — E2E tests

---

## Unit Tests

### Priority 1: Validation Functions

| Function | File | Test Cases |
|----------|------|------------|
| `validateReportInput` | `lib/validations/report.ts` | Valid input, missing content, too long content, empty blockers, max length |
| `validateInviteEmployeeInput` | `lib/validations/employee.ts` | Valid input, missing email, invalid email, missing name, invalid role, missing department for non-admin |
| `validateEditEmployeeInput` | `lib/validations/employee.ts` | Same as invite |
| `validateDepartmentName` | `lib/validations/department.ts` | Valid name, empty name, whitespace only |

**Example Test:**

```typescript
describe("validateReportInput", () => {
  it("returns valid for complete input", () => {
    const result = validateReportInput({
      content: "Did some work",
      blockers: "",
      additionalNotes: "",
    });
    expect(result.valid).toBe(true);
  });

  it("returns error for empty content", () => {
    const result = validateReportInput({
      content: "",
      blockers: "",
      additionalNotes: "",
    });
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.content).toBe("Describe what you worked on today.");
  });

  it("returns error for content exceeding max length", () => {
    const result = validateReportInput({
      content: "x".repeat(4001),
      blockers: "",
      additionalNotes: "",
    });
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.content).toContain("4000");
  });
});
```

### Priority 2: Status Computation

| Function | File | Test Cases |
|----------|------|------------|
| `getSubmissionStatus` | `lib/reports/submission-status.ts` | On time, late, missed, edge cases at deadline hour |
| `computeReportStats` | `lib/helpers/report-stats.ts` | Streak counting, monthly count, completion percentage, average time |
| `computeEmployeeStatus` | `lib/supabase/queries/admin/employees.ts` | Active, invited, pending, disabled, archived |

**Example Test:**

```typescript
describe("getSubmissionStatus", () => {
  it("returns on_time for submission before deadline", () => {
    const status = getSubmissionStatus("2026-08-01T14:00:00Z", 17);
    expect(status).toBe("on_time");
  });

  it("returns late for submission at deadline hour", () => {
    const status = getSubmissionStatus("2026-08-01T17:30:00Z", 17);
    expect(status).toBe("late");
  });

  it("returns missed for null submission", () => {
    const status = getSubmissionStatus(null, 17);
    expect(status).toBe("missed");
  });
});
```

### Priority 3: Date Helpers

| Function | File | Test Cases |
|----------|------|------------|
| `todayDateString` | `lib/helpers/dates.ts` | Returns YYYY-MM-DD format |
| `daysBetweenDateStrings` | `lib/helpers/dates.ts` | Same day, consecutive days, week apart |
| `dateNDaysAgo` | `lib/helpers/dates.ts` | 0 days ago, 7 days ago, 30 days ago |

### Priority 4: Trend Building

| Function | File | Test Cases |
|----------|------|------------|
| `buildSubmittersByDate` | `lib/helpers/completion-trend.ts` | Empty array, single report, multiple per date |
| `buildCompletionTrend` | `lib/helpers/completion-trend.ts` | 7-day trend, zero denominator, partial data |

---

## Integration Tests

### Server Actions

Mock Supabase client and test business logic:

| Action | File | Test Cases |
|--------|------|------------|
| `submitDailyReport` | `lib/actions/reports.ts` | Success, duplicate violation, validation error, auth error |
| `inviteEmployee` | `lib/actions/admin/employees.ts` | Success, email exists, profile update failure |
| `setEmployeeActive` | `lib/actions/admin/employees.ts` | Activate, deactivate, self-deactivate blocked, last admin blocked |
| `archiveEmployee` | `lib/actions/admin/employees.ts` | Success, self-archive blocked, last admin blocked |
| `permanentlyDeleteEmployee` | `lib/actions/admin/employees.ts` | Success, not archived, last admin blocked |
| `createDepartment` | `lib/actions/admin/departments.ts` | Success, duplicate name |
| `archiveDepartment` | `lib/actions/admin/departments.ts` | Success, has active members |

**Example Test:**

```typescript
describe("setEmployeeActive", () => {
  it("blocks deactivating yourself", async () => {
    const adminId = "admin-123";
    mockAuth({ userId: adminId, role: "admin" });
    
    const result = await setEmployeeActive(adminId, false);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe("You cannot deactivate your own account.");
  });

  it("blocks deactivating the last admin", async () => {
    mockAuth({ userId: "admin-1", role: "admin" });
    mockCountActiveAdmins(1);
    mockProfile({ id: "admin-2", role: "admin" });
    
    const result = await setEmployeeActive("admin-2", false);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe("The last administrator cannot be deactivated.");
  });
});
```

### Query Functions

Test with mocked Supabase responses:

| Query | File | Test Cases |
|-------|------|------------|
| `getCurrentProfile` | `lib/supabase/queries/profile.ts` | Exists, not found, not authenticated |
| `getTodayReport` | `lib/supabase/queries/reports.ts` | Submitted, not submitted |
| `getTeamReportsForDate` | `lib/supabase/queries/manager/team.ts` | All submitted, some missing, empty team |

---

## E2E Tests

### Critical Flows

| Flow | Priority | Steps |
|------|----------|-------|
| **Employee submits report** | P0 | Login → Submit report → Verify dashboard updates |
| **Admin invites employee** | P0 | Login as admin → Invite → Verify in list |
| **Employee accepts invite** | P0 | Click invite link → Set password → Verify dashboard |
| **Manager views team reports** | P1 | Login as manager → View team → Verify employee reports |
| **Admin archives employee** | P1 | Archive → Verify status → Restore → Verify |
| **Admin creates department** | P1 | Create → Assign manager → Verify |

**Example Test:**

```typescript
test("employee submits daily report", async ({ page }) => {
  // Login
  await page.goto("/login");
  await page.fill('[name="email"]', "employee@test.com");
  await page.fill('[name="password"]', "password123");
  await page.click('button[type="submit"]');
  
  // Navigate to reports
  await page.waitForURL("/");
  await page.click('a[href="/reports"]');
  
  // Submit report
  await page.fill('textarea[name="content"]', "Test accomplishments");
  await page.click('button:text("Submit Report")');
  
  // Verify
  await expect(page.locator(".toast")).toContainText("submitted");
  await page.goto("/");
  await expect(page.locator('[data-testid="today-status"]')).toContainText("Submitted");
});
```

---

## Manual QA Checklist

### Authentication

- [ ] Login with valid credentials → redirects to dashboard
- [ ] Login with invalid credentials → shows error
- [ ] Login with deactivated account → shows error
- [ ] Logout → redirects to login, clears session
- [ ] Invite link works for new user
- [ ] Expired invite link shows error
- [ ] Password change works
- [ ] Password requirements enforced (8+ chars)

### Employee Features

- [ ] Dashboard shows correct greeting and date
- [ ] Dashboard shows department badge
- [ ] Dashboard shows streak and completion %
- [ ] Can submit report with required field only
- [ ] Can submit report with all fields
- [ ] Cannot submit second report same day
- [ ] Report history shows all past reports
- [ ] Recent reports card shows last 5
- [ ] Profile edit works
- [ ] Profile shows correct info

### Manager Features

- [ ] Dashboard shows team stats
- [ ] Dashboard shows correct completion %
- [ ] Can filter team reports by date
- [ ] Missing reports shows correct employees
- [ ] Can view individual employee reports
- [ ] Team roster shows all department employees
- [ ] Archived employees not in roster
- [ ] Completion trend chart renders

### Admin Features

- [ ] Dashboard shows org stats
- [ ] Can invite employee with all roles
- [ ] Invited employee appears in list
- [ ] Can edit employee details
- [ ] Can change employee role
- [ ] Can change employee department
- [ ] Can deactivate employee
- [ ] Cannot deactivate self
- [ ] Cannot deactivate last admin
- [ ] Can archive employee
- [ ] Can restore archived employee
- [ ] Can permanently delete archived employee
- [ ] Can create department
- [ ] Can rename department
- [ ] Can assign manager to department
- [ ] Can archive empty department
- [ ] Cannot archive department with members
- [ ] Can restore department
- [ ] Can delete archived department
- [ ] Report deadline setting works
- [ ] Activity feed shows recent events

### Edge Cases

- [ ] Employee with no department shows "Unassigned"
- [ ] Manager with empty team sees appropriate message
- [ ] New org with no data shows empty states
- [ ] Very long text is handled gracefully
- [ ] Network errors show user-friendly messages
- [ ] Concurrent submissions don't cause issues

### Mobile Responsiveness

- [ ] Navigation works on mobile
- [ ] Forms are usable on mobile
- [ ] Tables convert to cards on mobile
- [ ] Touch targets are large enough

### Accessibility

- [ ] All forms are keyboard navigable
- [ ] Focus indicators visible
- [ ] Screen reader announces errors
- [ ] Color contrast passes WCAG AA

---

## Regression Tests

### After Any Change

1. Run TypeScript check: `npx tsc --noEmit`
2. Run lint: `npx eslint .`
3. Run build: `npm run build`
4. Manually test affected feature

### Before Release

1. Full manual QA checklist
2. Test on multiple browsers (Chrome, Firefox, Safari)
3. Test on mobile device
4. Load test with demo data

---

## Test Data Setup

### For Local Testing

1. Apply all migrations
2. Run seed.sql for departments
3. Bootstrap admin account (see README)
4. Invite test employees through UI
5. Use scripts/demo-reports.sql to backfill reports

### For E2E Tests

```typescript
// test/fixtures.ts
export const testUsers = {
  admin: { email: "admin@test.com", password: "password123" },
  manager: { email: "manager@test.com", password: "password123" },
  employee: { email: "employee@test.com", password: "password123" },
};

export async function seedTestData(supabase) {
  // Create departments
  // Create test users via Admin API
  // Assign roles and departments
}
```

---

## Future Automation Strategy

### Phase 1: Unit Tests (Week 1-2)

1. Install Vitest
2. Add tests for validation functions
3. Add tests for status computation
4. Add tests for date helpers
5. Configure CI to run tests

### Phase 2: Integration Tests (Week 3-4)

1. Set up MSW for Supabase mocking
2. Add tests for server actions
3. Focus on auth guards and edge cases
4. Add tests for queries

### Phase 3: E2E Tests (Week 5-6)

1. Install Playwright
2. Add critical flow tests
3. Set up test user fixtures
4. Run E2E in CI (with test database)

### Phase 4: Continuous Improvement

1. Add tests for new features
2. Add regression tests for bugs
3. Monitor test coverage
4. Performance testing for large orgs

---

## Metrics

### Target Coverage

| Type | Target | Justification |
|------|--------|---------------|
| Validation | 100% | Pure functions, critical for data integrity |
| Status computation | 100% | Business logic correctness |
| Server actions | 80% | Auth guards and business rules |
| E2E critical flows | 100% | User-facing reliability |

### CI Requirements

- All tests pass before merge
- TypeScript check passes
- Lint passes
- Build succeeds
