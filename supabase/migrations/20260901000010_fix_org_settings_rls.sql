-- Fix organization_settings UPDATE policy.
-- After RBAC redesign the owner role is 'owner' not 'admin'.
-- The old policy silently blocked all saves.

drop policy if exists organization_settings_update_as_admin
  on public.organization_settings;

create policy organization_settings_update_as_owner
  on public.organization_settings for update
  using (public.current_profile_role() = 'owner')
  with check (public.current_profile_role() = 'owner');
