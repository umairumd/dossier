-- Members can see activity where they are the actor or the target,
-- limited to event types that are meaningful to the affected person.

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
      'leave_rejected'
    )
  );
