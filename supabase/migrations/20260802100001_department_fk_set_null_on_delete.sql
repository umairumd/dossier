-- Permanent department deletion (admin-only, archived departments only —
-- see lib/actions/admin/departments.ts) needs this FK to not block on
-- stale references. profiles.department_id currently has no ON DELETE
-- clause (default RESTRICT), so deleting a department that any archived
-- employee still points to would fail outright — archiving an employee
-- never clears their department_id, only departments.archived_at
-- blocking new archives while active members remain (see
-- archiveDepartment's countActiveDepartmentMembers check). SET NULL
-- mirrors the existing departments.manager_id -> profiles.id behavior
-- (migration 20260730120003), which already uses the same pattern for
-- the same reason.

alter table public.profiles
  drop constraint profiles_department_id_fkey;

alter table public.profiles
  add constraint profiles_department_id_fkey
  foreign key (department_id) references public.departments (id)
  on delete set null;
