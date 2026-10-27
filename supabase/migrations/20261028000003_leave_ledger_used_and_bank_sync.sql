-- One-off data fix, applied by hand on 2026-10-28 after reviewing
-- 20261028000002_leave_ledger_reconcile.sql (its UPDATE was NOT used: the
-- reconstructed accrued figure double-counted the opening months).
-- Safe to re-run: both statements only touch rows that still differ.

-- 1) total_used follows the leave recorded in attendance for the contract year
update public.leave_balances lb
set total_used = x.used, updated_at = now()
from (
  select lb2.id, coalesce(sum(ar.leave_deducted), 0) as used
  from public.leave_balances lb2
  left join public.attendance_records ar
    on ar.profile_id = lb2.profile_id
   and ar.date between lb2.contract_year_start and lb2.contract_year_end
  where lb2.status = 'active'
  group by lb2.id
) x
where lb.id = x.id
  and lb.total_used is distinct from x.used;

-- 2) profiles.leave_balance matches the ledger for every active row
update public.profiles p
set leave_balance = lb.total_accrued - lb.total_used
from public.leave_balances lb
where lb.profile_id = p.id
  and lb.status = 'active'
  and p.leave_balance is distinct from (lb.total_accrued - lb.total_used);
