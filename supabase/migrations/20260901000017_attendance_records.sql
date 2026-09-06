-- Attendance records: one row per employee per calendar day.
-- Status covers all attendance outcomes including leaves.
-- Fine amount is computed and stored on save (not derived at query time)
-- so historical records are immutable even if fine settings change later.

create type public.attendance_status as enum (
  'present',          -- on time
  'late_minor',       -- after grace period, fine = fine_late_amount
  'late_major',       -- significantly late, fine = fine_very_late_amount
  'work_from_home',   -- remote work day, counts as present, no fine
  'leave',            -- approved full day leave, deducts 1 from bank
  'half_leave',       -- approved half day, deducts 0.5 (full-time only)
  'absent',           -- no show, no notice — fine + leave deducted
  'weekly_off',       -- configured off day (Sunday etc.)
  'holiday'           -- org-declared public holiday
);

create table public.attendance_records (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  date         date not null,
  status       public.attendance_status not null,
  check_in_time time,           -- null for leave/off/holiday/wfh
  fine_amount  integer not null default 0,     -- PKR, computed on save
  leave_deducted numeric(3,1) not null default 0, -- 0, 0.5, or 1
  source       text not null default 'manual'
    constraint attendance_source_values
      check (source in ('manual', 'report', 'qr')),
  recorded_by  uuid references public.profiles (id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One record per employee per day
  constraint attendance_records_unique_day
    unique (org_id, profile_id, date)
);

comment on table public.attendance_records is
  'One row per employee per calendar day. Fine and leave_deducted are computed on save and stored for historical immutability.';
comment on column public.attendance_records.check_in_time is
  'Actual check-in time in org local timezone. Null for non-office statuses.';
comment on column public.attendance_records.fine_amount is
  'Fine in PKR computed at time of entry. Stored so historical records survive settings changes.';
comment on column public.attendance_records.leave_deducted is
  '0, 0.5, or 1 day deducted from leave bank. 0.5 for half_leave, 1 for leave/absent.';
comment on column public.attendance_records.source is
  'manual = HR entered, report = auto from daily report (remote staff), qr = future QR check-in.';

-- Indexes
create index attendance_records_profile_date_idx
  on public.attendance_records (profile_id, date desc);
create index attendance_records_org_date_idx
  on public.attendance_records (org_id, date desc);

-- Updated_at trigger (reused by leave_balances and leave_requests)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger attendance_records_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();

-- RLS
alter table public.attendance_records enable row level security;

-- Owners and admins can do everything
create policy attendance_records_admin_all
  on public.attendance_records for all
  using (public.current_profile_role() in ('owner', 'admin'))
  with check (public.current_profile_role() in ('owner', 'admin'));

-- Managers can view and insert/update records for their department members
-- (uses current_profile_department_ids to avoid profile_departments RLS recursion)
create policy attendance_records_manager_all
  on public.attendance_records for all
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

-- Employees can only view their own records
create policy attendance_records_self_select
  on public.attendance_records for select
  using (profile_id = auth.uid());
