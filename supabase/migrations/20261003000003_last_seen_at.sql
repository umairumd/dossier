-- Activity heartbeat for "Last Seen" on employee profiles / roster.
-- No default, no backfill: existing rows stay NULL until the user
-- next hits an authenticated app layout (falls back to last_sign_in_at).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
