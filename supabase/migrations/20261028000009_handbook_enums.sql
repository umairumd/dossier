-- Handbook notification and activity types.
-- Run this file on its own, before 20261028000010 (a new enum value can't
-- be used in the same transaction that adds it).

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'handbook_published';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'handbook_reminder';

ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'handbook_published';
