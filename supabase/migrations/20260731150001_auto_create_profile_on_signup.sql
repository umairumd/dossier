-- Fixes a signup gap: creating an auth.users row (e.g. via an admin invite
-- or the Supabase dashboard) never created a matching profiles row, so a
-- newly authenticated user had no profile and got stuck in a redirect loop
-- between "/" and "/login".
--
-- Root-cause fix: a trigger on auth.users creates the profiles row
-- automatically, in the same transaction as the auth user. This makes it
-- impossible to create an auth user without a matching profile going
-- forward, regardless of whether the account was created through this
-- app, the Supabase dashboard, or the Admin API — an application-level
-- fix (e.g. "create the profile on first login") would only cover logins
-- that go through this app's own login action, leaving the same gap open
-- for every other account-creation path.

-- department_id was previously required for role IN ('employee','manager'),
-- but a brand-new signup has no department yet — that's an admin's job to
-- assign afterward, not something knowable at account-creation time. An
-- employee/manager with department_id = null is now a valid, expected
-- "not yet assigned" state; RLS's manager-scoped policies already exclude
-- null-department rows naturally (null never equals another department's
-- id), so this doesn't loosen any actual access control.
alter table public.profiles
  drop constraint profiles_department_required_check;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'New user'),
    'employee'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a matching profiles row whenever a new auth.users row is inserted, defaulting to role = employee with no department until an admin assigns one.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill: any auth.users row created before this migration that's still
-- missing a profile (the exact bug being fixed) gets one now.
insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email, 'New user'),
  'employee'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
