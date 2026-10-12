-- Leave balance adjustments become visible: an activity event and a
-- notification type. Run this file on its own, before
-- 20261012000002 (a new enum value can't be used in the same transaction).
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'leave_balance_adjusted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'leave_balance_adjusted';
