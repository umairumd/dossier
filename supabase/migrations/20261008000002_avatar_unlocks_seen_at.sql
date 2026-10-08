-- A progress-tile unlock stays "new" until the person wears it or dismisses it.
-- seen_at is separate from unlocked_at. Null means the hero may still highlight it.

alter table public.avatar_unlocks
  add column if not exists seen_at timestamptz;

comment on column public.avatar_unlocks.seen_at is
  'When the person wore this item or dismissed the hero unlock row. Null = unseen.';
