-- Fix 42P17 infinite recursion on profile_departments SELECT policies.
-- Manager policies must not query profile_departments from inside a
-- policy on that same table; use a security definer helper instead.

-- PART 1: Helper (bypasses RLS, same pattern as current_profile_role)

create or replace function public.current_profile_department_ids()
returns uuid[]
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    array_agg(department_id),
    '{}'::uuid[]
  )
  from public.profile_departments
  where profile_id = auth.uid();
$$;

comment on function public.current_profile_department_ids() is
  'Returns the department IDs the current user belongs to, bypassing RLS to avoid recursive policy evaluation on profile_departments.';

-- PART 2: profile_departments manager SELECT

drop policy if exists profile_departments_select_as_manager
  on public.profile_departments;

create policy profile_departments_select_as_manager
  on public.profile_departments for select
  using (
    public.current_profile_role() = 'manager'
    and department_id = any(public.current_profile_department_ids())
  );

-- PART 3: profiles manager SELECT

drop policy if exists profiles_select_department_as_manager
  on public.profiles;

create policy profiles_select_department_as_manager
  on public.profiles for select
  using (
    public.current_profile_role() = 'manager'
    and id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any(public.current_profile_department_ids())
    )
  );

-- PART 4: daily_reports manager SELECT

drop policy if exists daily_reports_select_department_as_manager
  on public.daily_reports;

create policy daily_reports_select_department_as_manager
  on public.daily_reports for select
  using (
    public.current_profile_role() = 'manager'
    and author_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any(public.current_profile_department_ids())
    )
  );
