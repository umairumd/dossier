-- Row Level Security for profiles, departments, and daily_reports.
--
-- Helper functions: policies below need "what is the requesting user's own
-- role/department" repeatedly. Querying public.profiles directly from
-- inside a policy *on* public.profiles would recurse into the same RLS
-- being evaluated. These two functions are security definer + stable, so
-- they read profiles once, bypassing RLS, and are safe to call from any
-- policy without recursion.

create function public.current_profile_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.current_profile_department_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select department_id from public.profiles where id = auth.uid();
$$;

comment on function public.current_profile_role() is
  'The requesting user''s own role, read bypassing RLS to avoid recursive policy evaluation.';
comment on function public.current_profile_department_id() is
  'The requesting user''s own department_id, read bypassing RLS to avoid recursive policy evaluation.';

-- profiles: employees/managers cannot change their own role or department.
-- RLS is row-level, not column-level, so this is enforced with a trigger
-- rather than a WITH CHECK clause.

create function public.enforce_profile_role_department_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() <> 'admin'
     and (new.role is distinct from old.role
          or new.department_id is distinct from old.department_id) then
    raise exception
      'role and department_id can only be changed by an admin';
  end if;
  return new;
end;
$$;

create trigger profiles_role_department_immutability
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_department_immutability();

-- Enable RLS

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.daily_reports enable row level security;

-- profiles policies

create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid());

create policy profiles_select_department_as_manager
  on public.profiles for select
  using (
    public.current_profile_role() = 'manager'
    and department_id = public.current_profile_department_id()
  );

create policy profiles_select_all_as_admin
  on public.profiles for select
  using (public.current_profile_role() = 'admin');

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_all_as_admin
  on public.profiles for update
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- No insert policy: profile rows are created by an admin-only path (or a
-- future signup trigger, out of scope for this milestone), not by
-- self-service insert.

-- departments policies

create policy departments_select_all_authenticated
  on public.departments for select
  to authenticated
  using (true);

create policy departments_write_as_admin
  on public.departments for insert
  with check (public.current_profile_role() = 'admin');

create policy departments_update_as_admin
  on public.departments for update
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

create policy departments_delete_as_admin
  on public.departments for delete
  using (public.current_profile_role() = 'admin');

-- daily_reports policies
--
-- No update or delete policy exists for any role, admins included —
-- immutability is enforced at the database layer, not just the app layer.

create policy daily_reports_select_own
  on public.daily_reports for select
  using (author_id = auth.uid());

create policy daily_reports_select_department_as_manager
  on public.daily_reports for select
  using (
    public.current_profile_role() = 'manager'
    and exists (
      select 1 from public.profiles author
      where author.id = daily_reports.author_id
        and author.department_id = public.current_profile_department_id()
    )
  );

create policy daily_reports_select_all_as_admin
  on public.daily_reports for select
  using (public.current_profile_role() = 'admin');

create policy daily_reports_insert_own
  on public.daily_reports for insert
  with check (author_id = auth.uid());
