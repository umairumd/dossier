-- Rollover runs from pg_cron and from the admin action (service role).
-- Signed-in users must not be able to call it directly.
revoke execute on function public.rollover_expired_leave_balances() from authenticated;
revoke execute on function public.rollover_expired_leave_balances() from anon;
