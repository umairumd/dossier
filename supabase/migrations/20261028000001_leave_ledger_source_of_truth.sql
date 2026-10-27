-- Leave ledger is the single source of truth.
-- profiles.leave_balance is a derived cache, kept in sync by trigger only.
-- Monthly accrual writes leave_balances.total_accrued (capped at 24) after
-- claiming a leave_accruals row; it never updates the bank directly.

create or replace function public.sync_profile_leave_balance_from_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'active' then
      update public.profiles
      set leave_balance = 0
      where id = old.profile_id;
    end if;
    return old;
  end if;

  if new.status = 'active' then
    update public.profiles
    set leave_balance = new.total_accrued - new.total_used
    where id = new.profile_id;
  elsif tg_op = 'UPDATE'
    and old.status = 'active'
    and new.status is distinct from 'active'
  then
    -- Active row closed (encash / expire); clear cache until a new active row exists.
    update public.profiles
    set leave_balance = 0
    where id = new.profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists leave_balances_sync_profile_bank on public.leave_balances;

create trigger leave_balances_sync_profile_bank
  after insert or delete or update of total_accrued, total_used, status
  on public.leave_balances
  for each row
  execute function public.sync_profile_leave_balance_from_ledger();

comment on function public.sync_profile_leave_balance_from_ledger() is
  'Keeps profiles.leave_balance = total_accrued - total_used for the active leave_balances row. App code must not write the bank directly.';

comment on column public.profiles.leave_balance is
  'Derived cache of leave_balances remaining (total_accrued - total_used) for the active contract year. Written only by sync_profile_leave_balance_from_ledger.';

-- Replace the bank-only monthly accrual with ledger-first accrual.
-- Requires pg_cron (same as the original job).
do $$
begin
  perform cron.unschedule('monthly-leave-accrual');
exception
  when others then
    raise notice 'monthly-leave-accrual was not scheduled: %', sqlerrm;
end;
$$;

select cron.schedule(
  'monthly-leave-accrual',
  '5 0 1 * *',
  $$
    with claimed as (
      insert into public.leave_accruals (profile_id, year, month, credited)
      select
        p.id,
        extract(year from now())::integer,
        extract(month from now())::integer,
        2
      from public.profiles p
      where p.is_active = true
        and p.archived_at is null
        and p.exclude_from_attendance = false
      on conflict (profile_id, year, month) do nothing
      returning profile_id
    )
    update public.leave_balances lb
    set total_accrued = least(lb.total_accrued + 2, 24)
    from claimed c
    where lb.profile_id = c.profile_id
      and lb.status = 'active'
      and lb.total_accrued < 24;
  $$
);
