-- Profiles who do not submit daily reports (e.g. owners, ops) should not
-- inflate completion / missing counts. Default true so existing employees
-- keep current behavior until explicitly opted out.

alter table public.profiles
  add column is_reporting boolean not null default true;

comment on column public.profiles.is_reporting is
  'When false, the profile is excluded from report completion / missing / roster stats. Default true so existing employees keep current behavior.';
