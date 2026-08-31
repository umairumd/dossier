-- RBAC redesign phase 1: organizations, junction tables, expanded roles.
-- Additive only — existing admin-named policies stay in place until a later
-- migration after application code is updated. 'employee' remains a valid
-- role alongside 'member' until the cleanup migration.

-- PART 1: Organizations

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant/org that scopes profiles and departments. Phase 1 seeds a single org.';

alter table public.organizations enable row level security;

create policy organizations_select_authenticated
  on public.organizations for select
  to authenticated
  using (true);

create policy organizations_update_as_owner
  on public.organizations for update
  using (public.current_profile_role() = 'owner')
  with check (public.current_profile_role() = 'owner');

insert into public.organizations (name, slug)
values ('Inoma Digital', 'inoma-digital');

-- PART 2: organization_id on profiles and departments (nullable until backfill)

alter table public.profiles
  add column organization_id uuid references public.organizations (id)
  on delete set null;

alter table public.departments
  add column organization_id uuid references public.organizations (id)
  on delete set null;

-- PART 3: Expand role CHECK — employee kept during transition

alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'admin', 'manager', 'member', 'employee'));

-- PART 4: profile_departments (many-to-many; profiles.department_id still exists)

create table public.profile_departments (
  profile_id uuid not null references public.profiles (id)
    on delete cascade,
  department_id uuid not null references public.departments (id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, department_id)
);

create index profile_departments_profile_id_idx
  on public.profile_departments (profile_id);
create index profile_departments_department_id_idx
  on public.profile_departments (department_id);

alter table public.profile_departments enable row level security;

create policy profile_departments_select_as_owner_admin
  on public.profile_departments for select
  using (public.current_profile_role() in ('owner', 'admin'));

create policy profile_departments_select_as_manager
  on public.profile_departments for select
  using (
    public.current_profile_role() = 'manager'
    and department_id in (
      select pd.department_id
      from public.profile_departments pd
      where pd.profile_id = auth.uid()
    )
  );

create policy profile_departments_select_own
  on public.profile_departments for select
  using (profile_id = auth.uid());

create policy profile_departments_insert_as_owner_admin
  on public.profile_departments for insert
  with check (public.current_profile_role() in ('owner', 'admin'));

create policy profile_departments_delete_as_owner_admin
  on public.profile_departments for delete
  using (public.current_profile_role() in ('owner', 'admin'));

-- PART 5: member_supervisors

create table public.member_supervisors (
  member_id uuid not null references public.profiles (id)
    on delete cascade,
  supervisor_id uuid not null references public.profiles (id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, supervisor_id)
);

create index member_supervisors_member_id_idx
  on public.member_supervisors (member_id);
create index member_supervisors_supervisor_id_idx
  on public.member_supervisors (supervisor_id);

alter table public.member_supervisors enable row level security;

create policy member_supervisors_select_as_owner_admin
  on public.member_supervisors for select
  using (public.current_profile_role() in ('owner', 'admin'));

create policy member_supervisors_select_own_assignments
  on public.member_supervisors for select
  using (supervisor_id = auth.uid());

create policy member_supervisors_select_own_supervisors
  on public.member_supervisors for select
  using (member_id = auth.uid());

create policy member_supervisors_insert_as_owner_admin
  on public.member_supervisors for insert
  with check (public.current_profile_role() in ('owner', 'admin'));

create policy member_supervisors_delete_as_owner_admin
  on public.member_supervisors for delete
  using (public.current_profile_role() in ('owner', 'admin'));

-- PART 6: Additive RLS for owner / HR-admin / supervisor
-- profiles_select_all_as_admin already exists (old super-admin). Do not
-- drop or recreate it here.

create policy profiles_select_all_as_owner
  on public.profiles for select
  using (public.current_profile_role() = 'owner');

create policy daily_reports_select_all_as_owner
  on public.daily_reports for select
  using (public.current_profile_role() = 'owner');

-- Named distinctly from daily_reports_select_all_as_admin, which stays.

create policy daily_reports_select_all_as_hr_admin
  on public.daily_reports for select
  using (public.current_profile_role() = 'admin');

create policy daily_reports_select_as_supervisor
  on public.daily_reports for select
  using (
    exists (
      select 1 from public.member_supervisors ms
      where ms.supervisor_id = auth.uid()
        and ms.member_id = daily_reports.author_id
    )
  );

create policy departments_write_as_owner
  on public.departments for insert
  with check (public.current_profile_role() = 'owner');

create policy departments_update_as_owner
  on public.departments for update
  using (public.current_profile_role() = 'owner')
  with check (public.current_profile_role() = 'owner');

create policy departments_delete_as_owner
  on public.departments for delete
  using (public.current_profile_role() = 'owner');

create policy departments_write_as_hr_admin
  on public.departments for insert
  with check (public.current_profile_role() = 'admin');

create policy departments_update_as_hr_admin
  on public.departments for update
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- PART 7: Immutability trigger — owner and admin may change role/department_id

create or replace function public.enforce_profile_role_department_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() not in ('owner', 'admin')
     and (new.role is distinct from old.role
          or new.department_id is distinct from old.department_id) then
    raise exception
      'role and department_id can only be changed by an owner or admin';
  end if;
  return new;
end;
$$;

-- PART 8: New auth users default to member, not employee

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'New user'),
    'member'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a matching profiles row whenever a new auth.users row is inserted, defaulting to role = member with no department until an owner or admin assigns one.';
