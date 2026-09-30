-- Add notification types for employee-targeted assignment and lifecycle events.
-- Apply manually in Supabase SQL Editor before relying on the new createNotification calls.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'shift_assigned';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'template_assigned';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'supervisor_assigned';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'employee_deactivated';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'employee_archived';
