-- Admins can save organization settings too (report deadline, attendance
-- rules and fines, shifts). Before this only the owner could update the row,
-- so admins' saves were silently ignored. Time zone and working days stay
-- owner-only: the server actions check that, since they change how past
-- reports and attendance are counted.

drop policy if exists organization_settings_update_as_owner
  on public.organization_settings;

create policy organization_settings_update_as_owner_admin
  on public.organization_settings for update
  to authenticated
  using ((select public.current_profile_role()) in ('owner', 'admin'))
  with check ((select public.current_profile_role()) in ('owner', 'admin'));
