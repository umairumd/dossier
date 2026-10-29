-- Tasks. Run on its own, before 20261029000011.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'task_assigned';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'task_commented';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'task_done';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'task_due';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'task_created';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'task_completed';
