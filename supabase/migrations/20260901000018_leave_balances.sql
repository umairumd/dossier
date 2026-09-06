-- Leave balances: one row per employee per contract year.
-- Contract year starts on the employee's joining month, runs 12 months.
-- Accrual: 2 days per month, triggered manually by HR or auto on 1st.
-- At contract year end: remaining balance is encashed, row closed,
-- new row created for next year.

create type public.leave_balance_status as enum (
  'active',    -- current contract year, still accruing
  'encashed',  -- contract year ended, balance paid out
  'expired'    -- closed without encashment (edge case)
);

create table public.leave_balances (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.organizations (id) on delete cascade,
  profile_id           uuid not null references public.profiles (id) on delete cascade,
  contract_year_start  date not null,  -- e.g. 2024-03-01
  contract_year_end    date not null,  -- e.g. 2025-02-28
  total_accrued        numeric(5,1) not null default 0,  -- increments by 2 monthly
  total_used           numeric(5,1) not null default 0,  -- increments on approved leave
  encashed_days        numeric(5,1) not null default 0,  -- set at year end
  encashed_at          timestamptz,
  status               public.leave_balance_status not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint leave_balances_year_order
    check (contract_year_end > contract_year_start),
  constraint leave_balances_accrued_positive
    check (total_accrued >= 0),
  constraint leave_balances_used_not_exceed_accrued
    check (total_used <= total_accrued),
  constraint leave_balances_one_active_per_employee
    unique (org_id, profile_id, contract_year_start)
);

comment on table public.leave_balances is
  'One row per employee per 12-month contract year. Balance = total_accrued - total_used.';
comment on column public.leave_balances.contract_year_start is
  'First day of the contract year — typically the month the employee joined.';
comment on column public.leave_balances.total_accrued is
  'Running total of days accrued. HR adds 2 at the start of each month.';
comment on column public.leave_balances.total_used is
  'Running total of days consumed by approved leaves and absences.';
comment on column public.leave_balances.encashed_days is
  'Days remaining at contract year end that were paid out. Set once on encashment.';

-- Computed balance helper (not stored — always derived)
-- balance_remaining = total_accrued - total_used

-- Indexes
create index leave_balances_profile_idx
  on public.leave_balances (profile_id, status);
create index leave_balances_org_active_idx
  on public.leave_balances (org_id, status)
  where status = 'active';

-- Updated_at trigger (reuse function from attendance_records migration)
create trigger leave_balances_updated_at
  before update on public.leave_balances
  for each row execute function public.set_updated_at();

-- RLS
alter table public.leave_balances enable row level security;

-- Owners and admins: full access
create policy leave_balances_admin_all
  on public.leave_balances for all
  using (public.current_profile_role() in ('owner', 'admin'))
  with check (public.current_profile_role() in ('owner', 'admin'));

-- Managers: view balances for their department members
-- (uses current_profile_department_ids to avoid profile_departments RLS recursion)
create policy leave_balances_manager_select
  on public.leave_balances for select
  using (
    public.current_profile_role() = 'manager'
    and profile_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any(public.current_profile_department_ids())
    )
  );

-- Employees: view their own balance only
create policy leave_balances_self_select
  on public.leave_balances for select
  using (profile_id = auth.uid());
