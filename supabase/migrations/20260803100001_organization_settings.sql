-- Organization Settings: a singleton row holding org-wide configuration.
-- Starts with exactly one value (the report deadline) — the same value
-- that was previously a hardcoded constant in
-- lib/reports/submission-status.ts, explicitly flagged at the time as a
-- stand-in for this. Modeled as a singleton table (not a key-value store)
-- because a handful of named, typed columns is simpler to read and
-- validate than a JSONB blob for the small number of settings this app
-- actually needs — extend with more columns as more settings arrive,
-- rather than introducing a generic settings-key abstraction that has no
-- second consumer yet.
--
-- The `id boolean primary key check (id)` shape is a standard Postgres
-- singleton-table pattern: a boolean primary key can only ever hold one
-- row where id = true, since a second row would require id = false,
-- which the check constraint forbids. This makes "there is exactly one
-- settings row" a database guarantee, not an application convention.

create table public.organization_settings (
  id boolean primary key default true,
  report_deadline_hour_utc smallint not null default 17,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,

  constraint organization_settings_singleton check (id),
  constraint organization_settings_deadline_hour_range
    check (report_deadline_hour_utc between 0 and 23)
);

comment on table public.organization_settings is
  'Singleton row of org-wide configuration. Exactly one row, id = true, enforced by the singleton check constraint.';
comment on column public.organization_settings.report_deadline_hour_utc is
  'Hour (0-23, UTC) after which a submitted report counts as Late. See lib/reports/submission-status.ts.';

insert into public.organization_settings (id) values (true);

alter table public.organization_settings enable row level security;

-- Every authenticated user needs to read this (submission status is
-- computed on the employee dashboard and manager reports alike), but
-- only admins can change it.
create policy organization_settings_select_all_authenticated
  on public.organization_settings for select
  to authenticated
  using (true);

create policy organization_settings_update_as_admin
  on public.organization_settings for update
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');
