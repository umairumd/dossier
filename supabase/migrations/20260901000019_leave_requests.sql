-- Leave requests: employee submits, HR/admin approves or rejects.
-- Informed = advance notice via email, HR marks it here.
-- Uninformed = no notice, HR marks as absent in attendance_records directly.
-- On approval: attendance_records row auto-created by application layer,
-- leave_balances.total_used incremented by leave_deducted amount.

create type public.leave_request_type as enum (
  'full_day',     -- 1 day deducted
  'half_day_am',  -- 0.5 day deducted, morning off
  'half_day_pm'   -- 0.5 day deducted, afternoon off
);

create type public.leave_request_status as enum (
  'pending',   -- awaiting HR/admin action
  'approved',  -- approved, attendance record created
  'rejected'   -- rejected, no attendance impact
);

create table public.leave_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  date         date not null,
  type         public.leave_request_type not null default 'full_day',
  informed     boolean not null default true,
  status       public.leave_request_status not null default 'pending',
  notes        text,                -- employee's reason
  admin_notes  text,                -- HR/admin response note
  requested_at timestamptz not null default now(),
  reviewed_by  uuid references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One request per employee per day (can't request same day twice)
  constraint leave_requests_unique_day
    unique (org_id, profile_id, date)
);

comment on table public.leave_requests is
  'Employee leave requests. Approval triggers attendance record creation and leave balance deduction in the application layer.';
comment on column public.leave_requests.informed is
  'True if employee gave advance notice (email to HR). False = uninformed, fine applies.';
comment on column public.leave_requests.type is
  'full_day deducts 1, half_day_am/pm deduct 0.5 from leave bank.';

-- Indexes
create index leave_requests_profile_idx
  on public.leave_requests (profile_id, date desc);
create index leave_requests_org_status_idx
  on public.leave_requests (org_id, status)
  where status = 'pending';

-- Updated_at trigger (reuse function from attendance_records migration)
create trigger leave_requests_updated_at
  before update on public.leave_requests
  for each row execute function public.set_updated_at();

-- RLS
alter table public.leave_requests enable row level security;

-- Owners and admins: full access
create policy leave_requests_admin_all
  on public.leave_requests for all
  using (public.current_profile_role() in ('owner', 'admin'))
  with check (public.current_profile_role() in ('owner', 'admin'));

-- Managers: view and update (approve/reject) requests for their dept members
-- (uses current_profile_department_ids to avoid profile_departments RLS recursion)
create policy leave_requests_manager_all
  on public.leave_requests for all
  using (
    public.current_profile_role() = 'manager'
    and profile_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any(public.current_profile_department_ids())
    )
  )
  with check (
    public.current_profile_role() = 'manager'
    and profile_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any(public.current_profile_department_ids())
    )
  );

-- Employees: view their own requests, insert new ones
create policy leave_requests_self_select
  on public.leave_requests for select
  using (profile_id = auth.uid());

create policy leave_requests_self_insert
  on public.leave_requests for insert
  with check (
    profile_id = auth.uid()
    and status = 'pending'
    and informed = true
  );
