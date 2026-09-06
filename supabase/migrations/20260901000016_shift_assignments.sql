-- Shift assignments: tracks which shift type each employee is on,
-- with history support so shifts can change over time.
-- Always use the row with the latest effective_from <= today as current.

create type public.shift_type as enum ('fulltime', 'morning', 'evening');

create table public.shift_assignments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  shift_type  public.shift_type not null,
  effective_from date not null default current_date,
  effective_to   date,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),

  constraint shift_assignments_date_order
    check (effective_to is null or effective_to > effective_from)
);

comment on table public.shift_assignments is
  'Tracks shift assignments per employee over time. Current shift = latest row where effective_from <= today.';
comment on column public.shift_assignments.effective_to is
  'Null means currently active. Set when shift changes.';

-- Index for fast current-shift lookup per employee
create index shift_assignments_profile_date_idx
  on public.shift_assignments (profile_id, effective_from desc);

-- RLS
alter table public.shift_assignments enable row level security;

-- Admins and owners can manage all shift assignments
create policy shift_assignments_admin_all
  on public.shift_assignments for all
  using (public.current_profile_role() in ('owner', 'admin'))
  with check (public.current_profile_role() in ('owner', 'admin'));

-- Managers can view shifts for their department members
-- (uses current_profile_department_ids to avoid profile_departments RLS recursion)
create policy shift_assignments_manager_select
  on public.shift_assignments for select
  using (
    public.current_profile_role() = 'manager'
    and profile_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any(public.current_profile_department_ids())
    )
  );

-- Employees can view their own shift
create policy shift_assignments_self_select
  on public.shift_assignments for select
  using (profile_id = auth.uid());
