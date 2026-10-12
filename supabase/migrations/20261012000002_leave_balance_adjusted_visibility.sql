-- Employees can read the adjustments made to their own leave balance
-- (admins already can, via leave_balance_adjustments_admin_read).
DROP POLICY IF EXISTS leave_balance_adjustments_own_read ON public.leave_balance_adjustments;
CREATE POLICY leave_balance_adjustments_own_read
  ON public.leave_balance_adjustments
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Members see adjustments to their own balance in their activity, like
-- leave approvals. Same policy as 20261003000004 plus the new event type.
drop policy if exists "activity_log_member_select" on public.activity_log;

create policy "activity_log_member_select"
  on public.activity_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.organization_id = activity_log.org_id
        and p.role = 'member'
    )
    and (actor_id = auth.uid() or target_id = auth.uid())
    and event_type in (
      'employee_onboarded',
      'employee_edited',
      'employee_deactivated',
      'employee_reactivated',
      'department_assigned',
      'supervisor_assigned',
      'template_assigned',
      'shift_assigned',
      'report_submitted',
      'attendance_recorded',
      'leave_approved',
      'leave_rejected',
      'leave_balance_adjusted'
    )
  );

-- Managers: leave balances are private, so they see balance adjustments only
-- for themselves, never for their teammates. Otherwise the same policy as
-- 20261003000005.
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
    and (event_type <> 'leave_balance_adjusted' or target_id = auth.uid())
    and target_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any(public.current_profile_department_ids())
    )
  );
