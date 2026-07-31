# Inoma Hub — Manual Testing Guide

This guide provides test scenarios, QA checklists, and procedures for internal team testing.

---

## Test Environment Setup

### Prerequisites

1. Application deployed and accessible
2. Demo data seeded (see [Demo Setup](./DEMO_SETUP.md))
3. Test credentials available

### Demo Credentials

All demo accounts use password: **`demo123!`**

| Role | Email | Name |
|------|-------|------|
| Admin | admin@demo.inoma.local | Demo Admin |
| Manager | eng.manager@demo.inoma.local | Sarah Chen |
| Manager | design.manager@demo.inoma.local | Marcus Johnson |
| Employee | alice@demo.inoma.local | Alice Rivera |
| Employee | bob@demo.inoma.local | Bob Patel |
| Employee | carol@demo.inoma.local | Carol Williams |
| Employee | dave@demo.inoma.local | Dave Kim |
| Employee | eva@demo.inoma.local | Eva Martinez |
| Pending | pending@demo.inoma.local | Pending Pete (unconfirmed) |

---

## Test Scenarios by Role

### Employee Testing (alice@demo.inoma.local)

#### Scenario E1: Dashboard Review
1. Sign in as Alice
2. **Verify:** Dashboard shows greeting with name and date
3. **Verify:** Department badge shows "Engineering"
4. **Verify:** Streak and completion stats display
5. **Verify:** Today's status card shows submission state
6. **Verify:** Recent reports section shows history

#### Scenario E2: Submit Daily Report
1. Navigate to Reports > Daily Report
2. Enter accomplishments (required)
3. Optionally add blockers and notes
4. Click "Submit Report"
5. **Verify:** Success toast appears
6. **Verify:** Cannot submit second report same day
7. **Verify:** Dashboard updates to show "Submitted"

#### Scenario E3: View Report History
1. Navigate to Reports > Report History
2. **Verify:** Past reports display with dates
3. **Verify:** On Time/Late badges show correctly
4. **Verify:** Report content is readable

#### Scenario E4: Profile Settings
1. Navigate to Settings > Profile
2. Change name
3. Save changes
4. **Verify:** Success toast, name updates in header

#### Scenario E5: Password Change
1. Navigate to Settings > Account
2. Enter current and new password
3. Save changes
4. Sign out and sign in with new password
5. **Verify:** Sign in succeeds

---

### Manager Testing (eng.manager@demo.inoma.local)

#### Scenario M1: Team Dashboard
1. Sign in as Sarah Chen
2. **Verify:** Dashboard shows "Engineering Dashboard"
3. **Verify:** Team stats (submitted, missing, completion %)
4. **Verify:** Completion trend chart displays
5. **Verify:** Team highlights show streaks and frequent missers
6. **Verify:** Recent activity feed shows team events

#### Scenario M2: Team Reports
1. Navigate to Reports > Team Reports
2. **Verify:** All Engineering employees listed
3. Use date filter to change date
4. **Verify:** Status badges (On Time/Late/Missed) display
5. Click on a submitted report row
6. **Verify:** Report detail sheet opens with content

#### Scenario M3: Missing Reports
1. Navigate to Reports > Missing Reports
2. **Verify:** Non-submitters for today listed
3. **Verify:** "Days Missed" column shows count
4. Click "View Profile" on an employee
5. **Verify:** Employee profile page loads

#### Scenario M4: Team Members
1. Navigate to People > Team Members
2. **Verify:** Engineering employees listed
3. Click on an employee name
4. **Verify:** Employee profile shows reports and stats

#### Scenario M5: Manager Submits Own Report
1. Navigate to Reports > Daily Report
2. Submit a report as the manager
3. **Verify:** Report submits successfully
4. Navigate to Reports > Report History
5. **Verify:** Manager's report appears in history

---

### Admin Testing (admin@demo.inoma.local)

#### Scenario A1: Organization Overview
1. Sign in as Demo Admin
2. **Verify:** Dashboard shows org-wide stats
3. **Verify:** Employee count, manager count, department count
4. **Verify:** Pending invitations count
5. **Verify:** Today's completion percentage
6. **Verify:** Activity feed shows recent events
7. **Verify:** Quick actions (Invite, Create Department) work

#### Scenario A2: Invite New Employee
1. Navigate to People > Employees
2. Click "Invite Employee"
3. Fill in email, name, role (employee), department
4. Click "Send Invitation"
5. **Verify:** Success toast, invite link displayed
6. Copy the invite link
7. **Verify:** New employee appears in list with "Invited" status

#### Scenario A3: Copy/Regenerate Invite Link
1. Find an invited/pending employee in list
2. Click "Invite Link" button
3. **Verify:** Sheet opens with generated link
4. Copy the link
5. Click "Generate New Link"
6. **Verify:** New link generated (different from before)
7. **Verify:** Old link no longer works

#### Scenario A4: Employee Management
1. Navigate to People > Employees
2. Click actions menu (three dots) on an employee
3. Click "Edit"
4. Change name or department
5. Save changes
6. **Verify:** Changes reflected in list
7. Test Deactivate action
8. **Verify:** Employee status changes to "Disabled"
9. Reactivate the employee
10. **Verify:** Status returns to "Active"

#### Scenario A5: Archive and Restore Employee
1. From actions menu, click "Archive"
2. Confirm in dialog
3. **Verify:** Employee moves to archived filter
4. Change filter to "Archived"
5. Click "Restore" on archived employee
6. **Verify:** Employee returns to active list

#### Scenario A6: Permanent Delete (Destructive)
1. Archive an employee first (cannot delete active)
2. Filter to "Archived"
3. Click "Delete Permanently" from menu
4. Confirm in dialog
5. **Verify:** Employee completely removed
6. **Verify:** Email now available to invite again

#### Scenario A7: Self-Protection
1. Try to deactivate yourself
2. **Verify:** Action disabled with tooltip "You cannot deactivate your own account"
3. Try to archive yourself
4. **Verify:** Action disabled
5. Try to change your own role to non-admin
6. **Verify:** Action blocked with error

#### Scenario A8: Last Admin Protection
1. Ensure only one admin exists
2. Try to deactivate that admin
3. **Verify:** Error "The last administrator cannot be deactivated"
4. Try to demote to employee
5. **Verify:** Error "The last administrator's role cannot be changed"

#### Scenario A9: Department Management
1. Navigate to People > Departments
2. Click "Create Department"
3. Enter name and optional manager
4. Save
5. **Verify:** Department appears in list
6. Edit department name
7. Assign a manager
8. Archive empty department
9. Restore archived department
10. Delete archived department

#### Scenario A10: Organization Settings
1. Navigate to Organization > Settings
2. Change report deadline hour
3. Save
4. **Verify:** Setting persists after page refresh

#### Scenario A11: Admin Submits Own Report
1. Navigate to Reports > Daily Report
2. Submit a report as admin
3. **Verify:** Report submits successfully

---

### Invitation Flow Testing

#### Scenario I1: Accept Invitation
1. As admin, create new invitation
2. Copy invite link
3. Open link in incognito/new browser
4. **Verify:** Invitation acceptance page loads
5. Set password (8+ characters)
6. Submit
7. **Verify:** Redirected to dashboard as new employee

#### Scenario I2: Expired/Invalid Invitation
1. Use an old or made-up invite token
2. **Verify:** Error message about invalid/expired link
3. **Verify:** Guidance to contact admin

---

## QA Checklist

### Authentication

- [ ] Login with valid credentials redirects to dashboard
- [ ] Login with invalid credentials shows error message
- [ ] Login with deactivated account shows appropriate error
- [ ] Logout clears session and redirects to login
- [ ] Invite acceptance flow works end-to-end
- [ ] Password change works and persists

### Employee Features

- [ ] Dashboard shows correct user info and stats
- [ ] Daily report submission works
- [ ] Cannot submit duplicate report same day
- [ ] Report history displays correctly
- [ ] Profile edit saves changes

### Manager Features

- [ ] Team dashboard shows correct stats
- [ ] Team reports filterable by date
- [ ] Missing reports table accurate
- [ ] Employee profiles accessible
- [ ] Manager can submit their own reports

### Admin Features

- [ ] Organization overview stats accurate
- [ ] Employee invite creates user and shows link
- [ ] Copy invite link works
- [ ] Employee edit saves changes
- [ ] Activate/Deactivate toggles correctly
- [ ] Archive/Restore works
- [ ] Permanent delete removes user completely
- [ ] Self-actions blocked appropriately
- [ ] Last admin protections work
- [ ] Department CRUD works
- [ ] Settings save correctly
- [ ] Admin can submit their own reports

### UI/UX

- [ ] All pages load without errors
- [ ] Navigation highlights current page
- [ ] Forms validate and show inline errors
- [ ] Toast notifications appear for actions
- [ ] Confirmation dialogs show for destructive actions
- [ ] Empty states display appropriate messages
- [ ] Mobile responsive layout works

### Edge Cases

- [ ] Very long names/content handled gracefully
- [ ] Empty organization shows helpful guidance
- [ ] Network errors show user-friendly messages
- [ ] Concurrent operations don't cause issues

---

## Regression Checklist

Run after any deployment or significant change:

1. [ ] Login works
2. [ ] Dashboard loads for each role
3. [ ] Report submission works
4. [ ] Admin can invite (and copy link)
5. [ ] Employee list loads and actions work
6. [ ] No console errors in browser

---

## Bug Report Template

When reporting bugs, please include:

```
## Bug Report

**URL:** [page where bug occurs]

**Role:** [Employee/Manager/Admin]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [etc.]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Browser/Device:**
[e.g., Chrome 120, macOS]

**Screenshot:**
[Attach if applicable]

**Console Errors:**
[Open DevTools > Console, copy any red errors]
```

---

## Testing Tips

1. **Use incognito windows** for multi-user testing
2. **Check console** for JavaScript errors after each action
3. **Test on mobile** using browser DevTools responsive mode
4. **Clear storage** between tests if behavior seems stale
5. **Note the exact URL** when bugs occur
6. **Screenshot before and after** for comparison

---

## Related Documentation

- [Demo Setup](./DEMO_SETUP.md) — Creating test data
- [Emergency Recovery](./EMERGENCY_RECOVERY.md) — Fixing locked accounts
- [Test Plan](./TEST_PLAN.md) — Comprehensive testing strategy
