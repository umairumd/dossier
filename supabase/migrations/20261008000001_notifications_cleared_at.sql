-- For you keeps a notification until the person acts on it.
-- cleared_at is separate from read_at: opening the nav bell marks rows
-- read and must not set this column.

alter table public.notifications
  add column cleared_at timestamptz;

create index notifications_profile_cleared_idx
  on public.notifications (profile_id, cleared_at);

-- notifications_self_update already lets a user update their own row:
--   using (profile_id = auth.uid()) with check (profile_id = auth.uid())
-- It is not limited to read_at. Table grants are on the table, not a
-- column list, so cleared_at is covered. No new policy.
