-- Record exports are for owners and admins: managers don't see them in
-- their team's activity. Same policy as 20261013000001 plus the new event.
-- Run after 20261013000003.

drop policy if exists "activity_log_manager_select" on public.activity_log;

create policy "activity_log_manager_select"
  on public.activity_log for select
  to authenticated
  using (
    (select public.current_profile_role()) = 'manager'
    and org_id = (
      select p.organization_id from public.profiles p
      where p.id = (select auth.uid())
    )
    and event_type not in (
      'org_settings_changed',
      'accrual_run',
      'department_created',
      'department_edited',
      'department_archived',
      'template_created',
      'template_edited',
      'template_archived',
      'record_exported'
    )
    and (event_type <> 'leave_balance_adjusted' or target_id = (select auth.uid()))
    and target_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id in (select unnest(public.current_profile_department_ids()))
    )
  );
