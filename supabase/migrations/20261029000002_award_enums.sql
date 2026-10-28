-- Awarded buddy items: notification and activity types.
-- Run this file on its own, before 20261029000003 and before the code uses them
-- (a new enum value can't be used in the same transaction that adds it).

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'item_awarded';

ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'item_awarded';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'item_revoked';
