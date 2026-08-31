-- Reporting rosters should exclude people who have never finished
-- account setup. Auth last_sign_in_at is not visible to PostgREST, so
-- the app stores that signal on profiles as has_onboarded.
-- Default false for new invitees; set true in app code after invite
-- password or a successful password login. No trigger.

alter table public.profiles
  add column has_onboarded boolean not null default false;

comment on column public.profiles.has_onboarded is
  'True once the user has completed invite password setup or signed in with a password. Reporting surfaces filter on this; invitations still list users who have not onboarded.';

update public.profiles p
set has_onboarded = true
from auth.users u
where u.id = p.id
  and u.last_sign_in_at is not null;
