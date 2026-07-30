-- Archive is a distinct, stronger state than the existing is_active
-- (deactivate/reactivate) flag: archived accounts are meant to be a
-- permanent-until-restored removal from the active org (excluded from
-- active rosters/headcounts), while deactivated-but-not-archived accounts
-- are just temporarily locked out but still considered part of the org.
-- Both states use the same Auth-level enforcement (ban_duration) so
-- neither can log in; the two columns just distinguish *why* and *how
-- permanently*, purely for display/filtering.

alter table public.profiles
  add column archived_at timestamptz;

alter table public.departments
  add column archived_at timestamptz;

comment on column public.profiles.archived_at is
  'Set when an admin archives this employee (soft-remove from the active org, reports kept). Null means not archived.';
comment on column public.departments.archived_at is
  'Set when an admin archives this department. Null means not archived.';
