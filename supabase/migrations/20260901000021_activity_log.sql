-- Activity log: persisted audit trail. One row per event.
-- Written at action time by server actions via admin client (bypasses RLS).
-- Never deleted — this is an append-only log.

create type public.activity_event_type as enum (
  -- Employee lifecycle
  'employee_invited',
  'employee_onboarded',
  'employee_edited',
  'employee_deactivated',
  'employee_reactivated',
  'employee_archived',
  'employee_restored',
  -- Assignments
  'department_assigned',
  'supervisor_assigned',
  'template_assigned',
  'shift_assigned',
  -- Reports
  'report_submitted',
  -- Departments
  'department_created',
  'department_edited',
  'department_archived',
  -- Attendance
  'attendance_recorded',
  'leave_approved',
  'leave_rejected',
  'accrual_run',
  -- Organization
  'org_settings_changed',
  -- Templates
  'template_created',
  'template_edited',
  'template_archived'
);

create table public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  event_type   public.activity_event_type not null,
  actor_id     uuid references public.profiles(id) on delete set null,
  actor_name   text,           -- denormalized, survives actor deletion
  target_id    uuid,           -- profile_id of the affected employee (if any)
  target_name  text,           -- denormalized
  entity_type  text,           -- 'employee' | 'department' | 'report' etc
  entity_id    uuid,           -- id of the primary entity
  entity_name  text,           -- denormalized name
  metadata     jsonb,          -- extra context (old/new values, notes)
  created_at   timestamptz not null default now()
);

create index activity_log_org_created_idx
  on public.activity_log (org_id, created_at desc);

create index activity_log_target_idx
  on public.activity_log (target_id, created_at desc)
  where target_id is not null;

alter table public.activity_log enable row level security;

-- Admins/owners see all activity
create policy activity_log_admin_select
  on public.activity_log for select
  using (public.current_profile_role() in ('owner', 'admin'));

-- Managers see activity where target is in their department
create policy activity_log_manager_select
  on public.activity_log for select
  using (
    public.current_profile_role() = 'manager'
    and (
      target_id is null
      or target_id in (
        select pd.profile_id
        from public.profile_departments pd
        where pd.department_id = any(public.current_profile_department_ids())
      )
    )
  );

-- No direct inserts from client — admin client bypasses RLS

-- Owner can delete any activity log entry
create policy activity_log_owner_delete
  on public.activity_log for delete
  using (public.current_profile_role() = 'owner');
