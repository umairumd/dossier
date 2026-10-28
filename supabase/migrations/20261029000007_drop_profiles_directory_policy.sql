-- profiles_select_directory_as_member let members and managers read owner,
-- admin, manager and supervisor profiles for the handbook's "Who to ask".
-- Managers' team lists (Team Members, Team Reports, Attendance) read profiles
-- through RLS, so owners and admins started showing up in them. The
-- directory is now loaded on the server for the signed-in person instead.

drop policy if exists profiles_select_directory_as_member on public.profiles;
drop function if exists public.my_directory_profile_ids();
