-- Adds the "active/inactive" status needed for admin-driven employee
-- deactivation. This column is a display/query convenience only — the
-- actual enforcement of "a deactivated user can't use the app" happens by
-- banning the user via the Supabase Admin API (see
-- lib/actions/admin/employees.ts), not by this flag. Every read path in
-- this app already calls supabase.auth.getUser() (which revalidates
-- against Supabase Auth on each call, unlike getSession()), so a banned
-- user is treated as signed out on their very next request without
-- needing extra RLS conditions layered on top of the ban itself.

alter table public.profiles
  add column is_active boolean not null default true;

comment on column public.profiles.is_active is
  'Mirrors the Supabase Auth ban status set by admin deactivation — display/query only, not itself an access-control boundary.';
