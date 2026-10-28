-- "Send wishes" on a teammate's birthday. Run on its own, before 20261029000006.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'birthday_wish';
