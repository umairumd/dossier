-- Add pending_invite_link column to profiles for invitation URL persistence.
-- This allows administrators to retrieve the current invitation URL without
-- regenerating it, which would invalidate the previous link.

alter table public.profiles
  add column pending_invite_link text default null;

comment on column public.profiles.pending_invite_link is
  'The current invitation URL for pending users. Cleared when the user accepts the invitation (email_confirmed_at is set). Stored so admins can retrieve it without regenerating.';
