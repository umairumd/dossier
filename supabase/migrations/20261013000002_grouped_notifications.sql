-- Admins hear about every report comment and every profile edit, grouped so
-- the bell stays quiet: one unread row per report (or per person) that
-- counts up instead of a new row each time.
-- Run this file on its own: new enum values can't be used in the same
-- transaction that adds them.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'team_report_commented';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'profile_updated';

-- How many events an unread grouped row stands for (1 for ordinary rows).
alter table public.notifications
  add column if not exists occurrences integer not null default 1;

-- Finding the open group for a recipient and entity.
create index if not exists notifications_group_idx
  on public.notifications (profile_id, type, entity_id)
  where read_at is null and cleared_at is null;
