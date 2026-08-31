-- RBAC redesign phase 3: drop legacy profiles.department_id and old
-- admin/manager RLS that keyed off it. Depends on phase 1 (junction
-- table, owner policies) and phase 2 (data backfill, employee → member).

-- PART 1: Drop old RLS policies

drop policy if exists profiles_select_all_as_admin
  on public.profiles;

drop policy if exists daily_reports_select_all_as_admin
  on public.daily_reports;

drop policy if exists departments_write_as_admin
  on public.departments;

drop policy if exists departments_update_as_admin
  on public.departments;

drop policy if exists departments_delete_as_admin
  on public.departments;

drop policy if exists profiles_update_all_as_admin
  on public.profiles;

drop policy if exists profiles_select_department_as_manager
  on public.profiles;

drop policy if exists daily_reports_select_department_as_manager
  on public.daily_reports;

-- PART 2: Recreate manager policies via profile_departments

create policy profiles_select_department_as_manager
  on public.profiles for select
  using (
    public.current_profile_role() = 'manager'
    and id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id in (
        select pd2.department_id
        from public.profile_departments pd2
        where pd2.profile_id = auth.uid()
      )
    )
  );

create policy daily_reports_select_department_as_manager
  on public.daily_reports for select
  using (
    public.current_profile_role() = 'manager'
    and author_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id in (
        select pd2.department_id
        from public.profile_departments pd2
        where pd2.profile_id = auth.uid()
      )
    )
  );

create policy profiles_update_as_owner
  on public.profiles for update
  using (public.current_profile_role() = 'owner')
  with check (public.current_profile_role() = 'owner');

create policy profiles_update_as_hr_admin
  on public.profiles for update
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- PART 3: Helper that read profiles.department_id

drop function if exists public.current_profile_department_id();

-- PART 4: departments.manager_id → profiles.department_id sync
-- Real trigger name from 20260731160001 is departments_sync_manager_department.

drop trigger if exists sync_manager_department
  on public.departments;

drop trigger if exists departments_sync_manager_department
  on public.departments;

drop function if exists public.sync_manager_profile_department();

-- PART 5: Drop profiles.department_id

drop trigger if exists profiles_role_department_immutability
  on public.profiles;

drop function if exists public.enforce_profile_role_department_immutability();

alter table public.profiles
  drop column department_id;

drop index if exists profiles_department_id_idx;

create function public.enforce_profile_role_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() not in ('owner', 'admin')
     and new.role is distinct from old.role then
    raise exception
      'role can only be changed by an owner or admin';
  end if;
  return new;
end;
$$;

create trigger profiles_role_immutability
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_immutability();

-- PART 6: employee is no longer a valid role

alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'admin', 'manager', 'member'));

-- PART 7: departments.manager_id still must point at role = manager

create or replace function public.enforce_department_manager_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.manager_id is not null then
    if not exists (
      select 1 from public.profiles
      where id = new.manager_id
        and role = 'manager'
    ) then
      raise exception
        'departments.manager_id (%) must reference a profile with role = manager',
        new.manager_id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.enforce_department_manager_role() is
  'Guards departments.manager_id: only a profile with role = manager may be assigned as a department manager.';
