-- Dossier Buddy: per-person avatar recipe + reward unlocks + backfill for existing members.
-- Rename the timestamp so it sorts after the latest migration in supabase/migrations/.

-- 1. Avatar recipe on the profile (null = generated default from the user id).
alter table public.profiles
  add column if not exists avatar jsonb;

comment on column public.profiles.avatar is
  'Buddy avatar {v, shape, palette, eyes{style,size,spacing}, cheeks, reaction, accessories{head,face,neck,body}}. Validated by lib/mascot/avatar.ts sanitizeAvatar(). Null = default from the user id.';

-- Keep it small and object-shaped.
alter table public.profiles
  drop constraint if exists profiles_avatar_shape;
alter table public.profiles
  add constraint profiles_avatar_shape
  check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 2048));

-- 2. Unlocked wardrobe items.
create table if not exists public.avatar_unlocks (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null,
  source text not null default 'auto',          -- 'auto' | 'grant' | 'migration'
  unlocked_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

comment on table public.avatar_unlocks is
  'Buddy wardrobe items a person has earned. Written by the server (service role) only.';

alter table public.avatar_unlocks enable row level security;

drop policy if exists "avatar_unlocks_select_own" on public.avatar_unlocks;
create policy "avatar_unlocks_select_own"
  on public.avatar_unlocks for select
  to authenticated
  using (profile_id = auth.uid());

-- No insert/update/delete policies: only the service role (lib/actions/avatar.ts) writes.

-- 3. Backfill: every existing member gets a random shape and colour (launch defaults for the rest).
--    Shapes = ACTIVE_SHAPES, palettes = PALETTE_IDS in lib/mascot. Only touches people with no avatar yet,
--    so re-running is safe and never overwrites someone's choice.
update public.profiles p
set avatar = jsonb_build_object(
  'v', 1,
  'shape', (array['orb','soft','pebble','onigiri','bean','drop','cube','gem','blob'])[1 + floor(random() * 9)::int],
  'palette', (array['sky','iris','mint','rose','honey','slate','coral','lagoon','lilac','peach','forest','graphite'])[1 + floor(random() * 12)::int],
  'eyes', jsonb_build_object('style', 'tall', 'size', 1, 'spacing', 1),
  'cheeks', 'none',
  'reaction', 'dizzy',
  'accessories', '{}'::jsonb
)
where p.avatar is null;

-- NOTE: profiles.avatar is written through the existing "update own profile" RLS policy.
-- If that policy (or a trigger) restricts which columns a member may update, allow `avatar`.
