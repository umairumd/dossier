-- Faster activity_log reads. Same rules as before; the signed-in user's id,
-- role, organisation and departments are now looked up once per query
-- (wrapped in a sub-select) instead of once per row.

drop policy if exists activity_log_admin_select on public.activity_log;

create policy activity_log_admin_select
  on public.activity_log for select
  using ((select public.current_profile_role()) in ('owner', 'admin'));

drop policy if exists "activity_log_member_select" on public.activity_log;

create policy "activity_log_member_select"
  on public.activity_log for select
  to authenticated
  using (
    (select public.current_profile_role()) = 'member'
    and org_id = (
      select p.organization_id from public.profiles p
      where p.id = (select auth.uid())
    )
    and (actor_id = (select auth.uid()) or target_id = (select auth.uid()))
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
      'template_archived'
    )
    and (event_type <> 'leave_balance_adjusted' or target_id = (select auth.uid()))
    and target_id in (
      select pd.profile_id
      from public.profile_departments pd
      where pd.department_id = any((select public.current_profile_department_ids()))
    )
  );

drop policy if exists activity_log_owner_delete on public.activity_log;

create policy activity_log_owner_delete
  on public.activity_log for delete
  using ((select public.current_profile_role()) = 'owner');

-- The personal feed filters on the actor as well as the target.
create index if not exists activity_log_actor_idx
  on public.activity_log (actor_id, created_at desc)
  where actor_id is not null;
