-- One row per wish: who wished whom, on which org-local day. Lets the sender's
-- birthday row show "Wished" and stops a second wish the same day.
-- Written only by the server (service role) after checking the birthday.
-- Run after 20261029000005.

create table if not exists public.birthday_wishes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  on_date date not null,
  created_at timestamptz not null default now(),
  constraint birthday_wishes_once_a_day unique (from_id, to_id, on_date),
  constraint birthday_wishes_not_self check (from_id <> to_id)
);

create index if not exists birthday_wishes_to_idx on public.birthday_wishes (to_id, on_date);

alter table public.birthday_wishes enable row level security;

drop policy if exists "birthday_wishes_select_own" on public.birthday_wishes;
create policy "birthday_wishes_select_own"
  on public.birthday_wishes
  for select
  to authenticated
  using (from_id = (select auth.uid()) or to_id = (select auth.uid()));

revoke insert, update, delete on public.birthday_wishes from anon, authenticated;
