-- Page titles and icons for links people paste in reports, comments and
-- tasks. Filled by the server (service role) the first time a link is shown,
-- then reused by everyone for 7 days. Holds public page metadata only.

create table if not exists public.link_previews (
  url text primary key,
  title text,
  site_name text,
  icon_url text,
  ok boolean not null default false,
  fetched_at timestamptz not null default now()
);

alter table public.link_previews enable row level security;

drop policy if exists "link_previews_select_signed_in" on public.link_previews;
create policy "link_previews_select_signed_in"
  on public.link_previews
  for select
  to authenticated
  using (true);

-- No insert, update or delete policies: only the service role writes.
revoke insert, update, delete on public.link_previews from anon, authenticated;
