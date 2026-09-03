-- Profile extensions: job title, remote flag, and photo URL.
-- File only; not applied to the live project in this change.

alter table public.profiles
  add column designation text,
  add column is_remote boolean not null default false,
  add column avatar_url text;

comment on column public.profiles.designation is
  'Job title e.g. "Graphic Designer", "Senior Developer". Set by owner/admin on invite or edit.';
comment on column public.profiles.is_remote is
  'True if this person works remotely.';
comment on column public.profiles.avatar_url is
  'Profile photo URL (Cloudflare R2 or Supabase Storage). Null uses MemberAvatar initials fallback.';
