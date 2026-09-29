-- Running leave balance on profiles (deducted on attendance save; accrued monthly).
alter table public.profiles
  add column leave_balance numeric not null default 0;

comment on column public.profiles.leave_balance is
  'Running leave bank balance in days. Credited by monthly pg_cron accrual; debited when attendance leave_deducted changes.';

-- Accrual log to prevent double-run and give history.
create table public.leave_accruals (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  year       integer not null,
  month      integer not null check (month between 1 and 12),
  credited   numeric not null default 2,
  run_at     timestamptz not null default now(),
  unique (profile_id, year, month)
);

comment on table public.leave_accruals is
  'One row per employee per calendar month when monthly leave accrual ran.';

create index leave_accruals_profile_idx
  on public.leave_accruals (profile_id, year desc, month desc);

alter table public.leave_accruals enable row level security;

create policy leave_accruals_admin_all
  on public.leave_accruals for all
  using (public.current_profile_role() in ('owner', 'admin'))
  with check (public.current_profile_role() in ('owner', 'admin'));

create policy leave_accruals_manager_select
  on public.leave_accruals for select
  using (
    public.current_profile_role() = 'manager'
    and profile_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any (public.current_profile_department_ids())
    )
  );

create policy leave_accruals_self_select
  on public.leave_accruals for select
  using (profile_id = auth.uid());

-- Requires Supabase Dashboard → Database → Extensions → pg_cron enabled before running.
select cron.schedule(
  'monthly-leave-accrual',
  '5 0 1 * *',
  $$
    update public.profiles
    set leave_balance = leave_balance + 2
    where is_active = true
      and archived_at is null
      and exclude_from_attendance = false;

    insert into public.leave_accruals (profile_id, year, month, credited)
    select
      id,
      extract(year from now())::integer,
      extract(month from now())::integer,
      2
    from public.profiles
    where is_active = true
      and archived_at is null
      and exclude_from_attendance = false
    on conflict (profile_id, year, month) do nothing;
  $$
);
