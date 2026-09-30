-- Tighten manager visibility on activity_log.
-- The previous policy exposed every org-wide event (target_id is null) to
-- managers. Managers now see only people/report/attendance-style events
-- whose target is in one of their own departments, and never see
-- org-wide or department-management events.
--
-- Department scoping uses current_profile_department_ids() (security
-- definer) so the policy does not recurse through profile_departments RLS.

drop policy if exists "activity_log_manager_select" on public.activity_log;

create policy "activity_log_manager_select"
  on public.activity_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.organization_id = activity_log.org_id
        and p.role = 'manager'
    )
    and event_type not in (
      'org_settings_changed',
      'accrual_run',
      'department_created',
      'department_edited',
      'department_archived',
      'template_created',
      'template_edited',
      'template_archived'
    )
    and (
      target_id is null
      or target_id in (
        select pd.profile_id
        from public.profile_departments pd
        where pd.department_id = any(public.current_profile_department_ids())
      )
    )
  );
