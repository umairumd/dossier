-- Notices: announcements and personal notices. Run on its own, before
-- 20261029000009.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'notice_posted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'notice_acknowledged';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'notice_posted';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'notice_acknowledged';
