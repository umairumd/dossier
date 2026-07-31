-- Optional local/demo seed data. Not part of the migration chain — this
-- only runs when explicitly invoked (e.g. `supabase db reset`, which
-- applies every migration and then this file). Safe to run more than
-- once: ON CONFLICT skips departments that already exist.
--
-- Deliberately does NOT create any auth.users / profiles rows. Supabase
-- Auth users must be created through the Auth API (GoTrue) to get
-- correctly hashed passwords and valid sessions — inserting rows into
-- auth.users directly via SQL is fragile and version-dependent, and this
-- app already has a proper creation path (the invite flow) that does it
-- correctly. To set up demo people:
--   1. Bootstrap your first admin — see README.md > "Demo data".
--   2. Sign in as that admin and use People > Employees > Invite
--      Employee to create manager and employee demo accounts.
--   3. Once those accounts exist, see docs/demo-reports.sql for a
--      template that backfills sample daily_reports, so dashboards,
--      streaks, and completion trends show realistic data instead of
--      being empty right after setup.

insert into public.departments (name) values
  ('Engineering'),
  ('Design'),
  ('Sales'),
  ('Customer Support')
on conflict (name) do nothing;
