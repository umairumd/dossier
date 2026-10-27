-- Preview (run first, SELECT only) — active rows past their contract year end:
--
-- select
--   p.full_name,
--   lb.contract_year_start,
--   lb.contract_year_end,
--   lb.total_accrued,
--   lb.total_used,
--   greatest(0, lb.total_accrued - lb.total_used) as would_encash_days
-- from public.leave_balances lb
-- join public.profiles p on p.id = lb.profile_id
-- where lb.status = 'active'
--   and lb.contract_year_end < current_date
-- order by p.full_name;
--
-- Per-employee year-end: encash expired active rows and open the next year
-- with accrued/used 0. Then reschedule monthly accrual to rollover first and
-- only credit months inside the active window. leave_accruals rows are never
-- inserted or deleted for past months here.

create or replace function public.rollover_expired_leave_balances()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  closed integer := 0;
  new_start date;
  new_end date;
  encashed numeric(5,1);
  new_id uuid;
begin
  loop
    if not exists (
      select 1
      from public.leave_balances
      where status = 'active'
        and contract_year_end < current_date
    ) then
      exit;
    end if;

    for r in
      select
        lb.id,
        lb.org_id,
        lb.profile_id,
        lb.contract_year_start,
        lb.contract_year_end,
        lb.total_accrued,
        lb.total_used,
        p.full_name
      from public.leave_balances lb
      join public.profiles p on p.id = lb.profile_id
      where lb.status = 'active'
        and lb.contract_year_end < current_date
    loop
      encashed := greatest(0, r.total_accrued - r.total_used);

      update public.leave_balances
      set
        status = 'encashed',
        encashed_days = encashed,
        encashed_at = now(),
        updated_at = now()
      where id = r.id;

      new_start := (r.contract_year_end + 1)::date;
      new_end := (new_start + interval '1 year' - interval '1 day')::date;

      insert into public.leave_balances (
        org_id,
        profile_id,
        contract_year_start,
        contract_year_end,
        total_accrued,
        total_used,
        status
      )
      values (
        r.org_id,
        r.profile_id,
        new_start,
        new_end,
        0,
        0,
        'active'
      )
      returning id into new_id;

      insert into public.activity_log (
        org_id,
        event_type,
        actor_id,
        actor_name,
        target_id,
        target_name,
        entity_type,
        entity_id,
        metadata
      )
      values (
        r.org_id,
        'leave_year_encashed',
        null,
        null,
        r.profile_id,
        r.full_name,
        'leave_balance',
        r.id,
        jsonb_build_object(
          'encashed_days', encashed,
          'contract_year_start', r.contract_year_start,
          'contract_year_end', r.contract_year_end,
          'next_year_start', new_start,
          'next_year_end', new_end,
          'next_leave_balance_id', new_id
        )
      );

      closed := closed + 1;
    end loop;
  end loop;

  return closed;
end;
$$;

revoke all on function public.rollover_expired_leave_balances() from public;
grant execute on function public.rollover_expired_leave_balances() to service_role;
grant execute on function public.rollover_expired_leave_balances() to authenticated;

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
    select public.rollover_expired_leave_balances();

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
    ),
    month_start as (
      select make_date(
        extract(year from now())::integer,
        extract(month from now())::integer,
        1
      ) as d
    )
    update public.leave_balances lb
    set total_accrued = least(lb.total_accrued + 2, 24)
    from claimed c, month_start m
    where lb.profile_id = c.profile_id
      and lb.status = 'active'
      and lb.total_accrued < 24
      and m.d >= lb.contract_year_start
      and m.d <= lb.contract_year_end;
  $$
);
