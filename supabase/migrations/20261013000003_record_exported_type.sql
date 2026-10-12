-- Exporting an employee record is logged in activity.
-- Run this file on its own, before 20261013000004 (a new enum value can't
-- be used in the same transaction that adds it).
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'record_exported';
