# Inoma Hub — Permissions & Roles

## Role Overview

Inoma Hub has three roles, stored in `profiles.role`:

| Role | Purpose | Count per Org |
|------|---------|---------------|
| **Employee** | Submits daily reports | Many |
| **Manager** | Reviews their department's reports | One per department |
| **Admin** | Manages the organization | At least one (protected) |

---

## Role Capabilities Matrix

### Data Access

| Resource | Employee | Manager | Admin |
|----------|----------|---------|-------|
| Own profile | Read, Update (name only) | Read, Update (name only) | Read, Update (name only) |
| Department profiles | — | Read (own dept) | Read (all) |
| All profiles | — | — | Read, Update, Delete |
| Departments | Read (list) | Read (list) | Full CRUD |
| Own reports | Read, Create | Read, Create | Read, Create |
| Department reports | — | Read (own dept) | Read (all) |
| All reports | — | — | Read (all) |
| Organization settings | Read | Read | Read, Update |

### Actions

| Action | Employee | Manager | Admin |
|--------|----------|---------|-------|
| Submit daily report | Yes | Yes (RLS) | Yes (RLS) |
| View report history | Own only | Own + dept | All |
| Change own password | Yes | Yes | Yes |
| Change own name | Yes | Yes | Yes |
| Invite employees | — | — | Yes |
| Edit employee details | — | — | Yes |
| Change employee role | — | — | Yes |
| Deactivate/Reactivate | — | — | Yes |
| Archive/Restore | — | — | Yes |
| Permanently delete | — | — | Yes (archived only) |
| Create departments | — | — | Yes |
| Edit departments | — | — | Yes |
| Assign managers | — | — | Yes |
| Archive departments | — | — | Yes |
| Change report deadline | — | — | Yes |
| View org analytics | — | — | Yes |
| View invitation list | — | — | Yes |
| Resend invitations | — | — | Yes |

---

## Employee Role

### What Employees Can Do

**Reports:**
- Submit one daily report per day
- View their own report history
- See their current streak and completion percentage

**Profile:**
- View their own profile details
- Change their display name
- Change their password

**Navigation:**
- Home (Employee Dashboard)
- Reports → Daily Report
- Reports → Report History
- Settings → Profile
- Settings → Account

### What Employees Cannot Do

- View other employees' reports
- View the team roster
- Change their role or department
- Access admin or manager routes

### RLS Enforcement

```sql
-- Employees can only read their own profile
create policy profiles_select_own on profiles for select
  using (id = auth.uid());

-- Employees can only read their own reports
create policy daily_reports_select_own on daily_reports for select
  using (author_id = auth.uid());

-- Employees can only insert reports for themselves
create policy daily_reports_insert_own on daily_reports for insert
  with check (author_id = auth.uid());
```

---

## Manager Role

### What Managers Can Do

**Team Oversight:**
- View team dashboard (today's completion, missing, trends)
- Browse team reports by date
- See who's missing reports and when they last submitted
- View team member profiles (read-only)
- View individual employee's recent reports

**Reports:**
- Submit their own daily report (via RLS, no nav link)
- View their own report history

**Profile:**
- Change their display name
- Change their password

**Navigation:**
- Home (Manager Dashboard)
- Reports → Team Reports
- Reports → Missing Reports
- People → Team Members
- Settings → Profile
- Settings → Account

### What Managers Cannot Do

- Invite or edit employees
- Change roles or departments
- Deactivate or archive anyone
- Access other departments' data
- Change organization settings

### RLS Enforcement

```sql
-- Managers can read profiles in their department
create policy profiles_select_department_as_manager on profiles for select
  using (
    current_profile_role() = 'manager'
    and department_id = current_profile_department_id()
  );

-- Managers can read reports from their department
create policy daily_reports_select_department_as_manager on daily_reports for select
  using (
    current_profile_role() = 'manager'
    and exists (
      select 1 from profiles author
      where author.id = daily_reports.author_id
        and author.department_id = current_profile_department_id()
    )
  );
```

### Manager Visibility Logic

A manager sees employees where:
1. `profiles.role = 'employee'`
2. `profiles.department_id = manager's department_id`
3. `profiles.archived_at IS NULL`

This is derived from the manager's own `profiles.department_id`, synced by a trigger when `departments.manager_id` is set.

---

## Admin Role

### What Admins Can Do

**Full Organization Management:**
- View organization overview dashboard
- Invite new employees with any role
- Edit any employee's details (name, email, role, department)
- Deactivate and reactivate accounts
- Archive and restore accounts
- Permanently delete archived accounts
- Create, edit, archive, and delete departments
- Assign managers to departments
- View all reports from all employees
- View organization-wide analytics
- Change organization settings (report deadline)
- View and manage invitations

**Reports:**
- Submit their own daily report (via RLS, no nav link)
- View their own report history

**Profile:**
- Change their display name
- Change their password

**Navigation:**
- Home (Admin Dashboard)
- Reports → Analytics
- People → Employees
- People → Departments
- Organization → Invitations
- Organization → Activity
- Organization → Settings
- Settings → Profile
- Settings → Account

### What Admins Cannot Do

- Demote themselves from admin
- Deactivate their own account
- Archive their own account
- Delete their own account
- Delete the last admin account
- Deactivate/archive the last active admin

### RLS Enforcement

```sql
-- Admins can read all profiles
create policy profiles_select_all_as_admin on profiles for select
  using (current_profile_role() = 'admin');

-- Admins can update all profiles
create policy profiles_update_all_as_admin on profiles for update
  using (current_profile_role() = 'admin')
  with check (current_profile_role() = 'admin');

-- Admins can read all reports
create policy daily_reports_select_all_as_admin on daily_reports for select
  using (current_profile_role() = 'admin');

-- Department operations require admin
create policy departments_write_as_admin on departments for insert
  with check (current_profile_role() = 'admin');
```

### Service Role Operations

Admin operations that modify auth.users (invite, email change, ban, delete) use the service-role client, which bypasses RLS. These operations are protected by `requireAdminUser()`:

```typescript
export async function requireAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Not authenticated.");
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
    
  if (profile?.role !== "admin") throw new Error("Not authorized.");
  
  return user;
}
```

---

## Account Safety Rules

### Last Admin Protection

The organization must always have at least one active, non-archived admin. The following operations check `countActiveAdmins()`:

| Operation | Check |
|-----------|-------|
| Change admin's role to non-admin | Must have ≥2 active admins |
| Deactivate an admin | Must have ≥2 active admins |
| Archive an admin | Must have ≥2 active admins |
| Permanently delete an admin | Must have ≥2 total admins (including archived) |

### Self-Protection

Admins cannot perform destructive actions on themselves:

- Cannot demote themselves (role change blocked)
- Cannot deactivate themselves (action blocked)
- Cannot archive themselves (action blocked)
- Cannot delete themselves (action blocked)

---

## Future Role Expansion

### Possible Future Roles

| Role | Use Case |
|------|----------|
| **Super Admin** | Multi-org management, billing |
| **HR Manager** | Leave approvals, documents, no report access |
| **Department Lead** | Manager + limited admin for their department |
| **Viewer** | Read-only access to reports (founder/executive) |

### Adding a New Role

1. Add to `profiles_role_check` constraint
2. Create RLS policies for the new role
3. Add to `UserRole` TypeScript type
4. Add navigation items with `roles: ["newrole"]`
5. Create any new layouts or route guards
6. Document in this file

### Dual-Role Considerations

Currently, each profile has exactly one role. If a manager needs to submit reports:
- RLS allows it (they can insert their own reports)
- But the nav doesn't show Daily Report for managers

Options for the future:
1. Add Daily Report to manager nav
2. Create a separate "reporting manager" role
3. Support multiple roles per profile

---

## Permission Troubleshooting

### "Not authorized" on Admin Action

1. Check `profiles.role = 'admin'` for the user
2. Verify `requireAdminUser()` is called before `createAdminClient()`
3. Check the user's session is valid (`getUser()` returns a user)

### Manager Can't See Team

1. Check manager's `profiles.department_id` matches the department
2. Verify `departments.manager_id` points to the manager
3. The sync trigger should handle this, but check both values

### Employee Can't Submit Report

1. Check `profiles.is_active = true`
2. Check `profiles.archived_at IS NULL`
3. Verify they haven't already submitted for today

### Report Not Visible to Manager

1. Check the author's `department_id` matches the manager's
2. Verify the report's `report_date` matches the filter
3. Check RLS policies are enabled on `daily_reports`
