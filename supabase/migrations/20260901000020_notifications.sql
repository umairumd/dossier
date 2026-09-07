-- Notifications: in-app only for now. Resend email is future work.
-- One row per recipient per event. Unread count drives the bell badge.

create type public.notification_type as enum (
  'leave_approved',
  'leave_rejected',
  'report_deadline',
  'employee_invited',
  'employee_onboarded',
  'attendance_fine',
  'leave_request_submitted'
);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  type         public.notification_type not null,
  title        text not null,
  body         text,
  entity_type  text,        -- 'employee' | 'leave_request' | 'report' etc
  entity_id    uuid,        -- id of the related entity
  read_at      timestamptz, -- null = unread
  created_at   timestamptz not null default now()
);

create index notifications_profile_unread_idx
  on public.notifications (profile_id, read_at)
  where read_at is null;

create index notifications_profile_created_idx
  on public.notifications (profile_id, created_at desc);

alter table public.notifications enable row level security;

-- Users can only see their own notifications
create policy notifications_self_select
  on public.notifications for select
  using (profile_id = auth.uid());

-- Admins insert notifications for others via service role (bypasses RLS)
-- Employees can mark their own as read
create policy notifications_self_update
  on public.notifications for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
