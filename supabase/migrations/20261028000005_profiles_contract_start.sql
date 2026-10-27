-- Per-employee contract anniversary (always the 1st of a month).
-- Backfill prefers the active ledger's contract_year_start so existing
-- numbers are unchanged; otherwise the month of profiles.created_at.

alter table public.profiles
  add column if not exists contract_start date;

update public.profiles p
set contract_start = coalesce(
  (
    select lb.contract_year_start
    from public.leave_balances lb
    where lb.profile_id = p.id
      and lb.status = 'active'
    order by lb.contract_year_start desc
    limit 1
  ),
  date_trunc('month', p.created_at::timestamp)::date
)
where p.contract_start is null;

alter table public.profiles
  alter column contract_start set not null;

comment on column public.profiles.contract_start is
  'First day of the employee''s leave-contract anniversary month. Active leave_balances windows are derived from this.';
