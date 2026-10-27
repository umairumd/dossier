-- Leave ledger reconcile (manual). PREVIEW ONLY: do not run the UPDATE below;
-- the data fix that was actually applied is 20261028000003.
--
-- How to use:
-- 1. Run the SELECT preview below in the Supabase SQL editor. Review every row
--    where ledger values differ from reconstructed accrued/used.
-- 2. When you are satisfied, uncomment the UPDATE block at the bottom and run
--    it once. The bank cache updates automatically via the leave_balances
--    trigger from 20261028000001_leave_ledger_source_of_truth.sql.
-- 3. Do not leave the UPDATE uncommented in production migrations runners —
--    this file is for hand review only.
--
-- Reconstruction:
--   reconstructed_accrued =
--     least(24,
--       initial months from contract_year_start through leave_balances.created_at
--         (inclusive) * 2
--       + sum(leave_accruals.credited) whose year/month falls in the contract year
--       + sum(leave_balance_adjustments.adjustment) for this ledger row)
--   reconstructed_used =
--     sum(attendance_records.leave_deducted) for dates in
--     [contract_year_start, contract_year_end]

-- Preview
select
  p.full_name,
  p.id as profile_id,
  lb.id as leave_balance_id,
  lb.contract_year_start,
  lb.contract_year_end,
  lb.total_accrued as ledger_accrued,
  lb.total_used as ledger_used,
  (lb.total_accrued - lb.total_used) as ledger_remaining,
  p.leave_balance as bank_balance,
  least(
    24::numeric,
    (
      greatest(
        1,
        (
          (extract(year from lb.created_at::date)::integer
            - extract(year from lb.contract_year_start)::integer) * 12
          + (extract(month from lb.created_at::date)::integer
            - extract(month from lb.contract_year_start)::integer)
          + 1
        )
      ) * 2
      + coalesce(acc.credited_sum, 0)
      + coalesce(adj.adjustment_sum, 0)
    )
  ) as reconstructed_accrued,
  coalesce(att.used_sum, 0) as reconstructed_used,
  least(
    24::numeric,
    (
      greatest(
        1,
        (
          (extract(year from lb.created_at::date)::integer
            - extract(year from lb.contract_year_start)::integer) * 12
          + (extract(month from lb.created_at::date)::integer
            - extract(month from lb.contract_year_start)::integer)
          + 1
        )
      ) * 2
      + coalesce(acc.credited_sum, 0)
      + coalesce(adj.adjustment_sum, 0)
    )
  ) - lb.total_accrued as accrued_delta,
  coalesce(att.used_sum, 0) - lb.total_used as used_delta
from public.profiles p
join public.leave_balances lb
  on lb.profile_id = p.id
 and lb.status = 'active'
left join lateral (
  select coalesce(sum(la.credited), 0) as credited_sum
  from public.leave_accruals la
  where la.profile_id = p.id
    and make_date(la.year, la.month, 1) >= date_trunc('month', lb.contract_year_start::timestamp)::date
    and make_date(la.year, la.month, 1) <= lb.contract_year_end
) acc on true
left join lateral (
  select coalesce(sum(a.adjustment), 0) as adjustment_sum
  from public.leave_balance_adjustments a
  where a.leave_balance_id = lb.id
) adj on true
left join lateral (
  select coalesce(sum(ar.leave_deducted), 0) as used_sum
  from public.attendance_records ar
  where ar.profile_id = p.id
    and ar.date >= lb.contract_year_start
    and ar.date <= lb.contract_year_end
) att on true
where p.is_active = true
  and p.archived_at is null
order by p.full_name;

-- ---------------------------------------------------------------------------
-- APPLY (review preview first, then uncomment and run once)
-- ---------------------------------------------------------------------------
--
-- update public.leave_balances lb
-- set
--   total_accrued = v.reconstructed_accrued,
--   total_used = v.reconstructed_used,
--   updated_at = now()
-- from (
--   select
--     lb.id as leave_balance_id,
--     least(
--       24::numeric,
--       (
--         greatest(
--           1,
--           (
--             (extract(year from lb.created_at::date)::integer
--               - extract(year from lb.contract_year_start)::integer) * 12
--             + (extract(month from lb.created_at::date)::integer
--               - extract(month from lb.contract_year_start)::integer)
--             + 1
--           )
--         ) * 2
--         + coalesce(acc.credited_sum, 0)
--         + coalesce(adj.adjustment_sum, 0)
--       )
--     ) as reconstructed_accrued,
--     coalesce(att.used_sum, 0) as reconstructed_used
--   from public.leave_balances lb
--   join public.profiles p on p.id = lb.profile_id
--   left join lateral (
--     select coalesce(sum(la.credited), 0) as credited_sum
--     from public.leave_accruals la
--     where la.profile_id = lb.profile_id
--       and make_date(la.year, la.month, 1) >= date_trunc('month', lb.contract_year_start::timestamp)::date
--       and make_date(la.year, la.month, 1) <= lb.contract_year_end
--   ) acc on true
--   left join lateral (
--     select coalesce(sum(a.adjustment), 0) as adjustment_sum
--     from public.leave_balance_adjustments a
--     where a.leave_balance_id = lb.id
--   ) adj on true
--   left join lateral (
--     select coalesce(sum(ar.leave_deducted), 0) as used_sum
--     from public.attendance_records ar
--     where ar.profile_id = lb.profile_id
--       and ar.date >= lb.contract_year_start
--       and ar.date <= lb.contract_year_end
--   ) att on true
--   where lb.status = 'active'
--     and p.is_active = true
--     and p.archived_at is null
-- ) v
-- where lb.id = v.leave_balance_id
--   and (
--     lb.total_accrued is distinct from v.reconstructed_accrued
--     or lb.total_used is distinct from v.reconstructed_used
--   );
