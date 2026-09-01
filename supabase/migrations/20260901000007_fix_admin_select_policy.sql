-- Restore missing SELECT policy for admin (HR) role on profiles.
-- profiles_select_all_as_admin was dropped in migration 003
-- (phase 3 cleanup) without creating the hr_admin SELECT replacement.
-- Applied directly to Supabase on 2026-09-01; this file records it.

create policy profiles_select_all_as_hr_admin
  on public.profiles for select
  using (public.current_profile_role() = 'admin');
