-- Attendance configuration columns on the singleton organization_settings row.
-- All attendance rules are configurable per org — no hardcoded values.
-- Shift times are stored as TIME (HH:MM:SS) in the org's local timezone.
-- Fine amounts are in PKR (integer, no decimals needed).

alter table public.organization_settings
  -- Grace period in minutes after shift start before lateness is recorded
  add column attendance_grace_minutes smallint not null default 15
    constraint attendance_grace_minutes_range check (attendance_grace_minutes between 0 and 60),

  -- Fine for arriving after grace period but within 30 min of shift start
  add column fine_late_amount integer not null default 200
    constraint fine_late_amount_positive check (fine_late_amount >= 0),

  -- Fine for arriving more than 30 min after shift start
  add column fine_very_late_amount integer not null default 300
    constraint fine_very_late_amount_positive check (fine_very_late_amount >= 0),

  -- Fine for uninformed absence (no advance notice to HR)
  add column fine_uninformed_amount integer not null default 500
    constraint fine_uninformed_amount_positive check (fine_uninformed_amount >= 0),

  -- Max informed leaves allowed per month before they become uninformed
  add column informed_leaves_per_month smallint not null default 2
    constraint informed_leaves_range check (informed_leaves_per_month between 0 and 31),

  -- Full-time shift start time in org local timezone
  add column shift_fulltime_start time not null default '09:00:00',

  -- Part-time morning shift start and end times
  add column shift_morning_start time not null default '09:00:00',
  add column shift_morning_end   time not null default '13:00:00',

  -- Part-time evening shift start and end times
  add column shift_evening_start time not null default '13:00:00',
  add column shift_evening_end   time not null default '17:30:00';

comment on column public.organization_settings.attendance_grace_minutes is
  'Minutes after shift start before a late mark is recorded. Default 15.';
comment on column public.organization_settings.fine_late_amount is
  'Fine (PKR) for arriving after grace period. Default 200.';
comment on column public.organization_settings.fine_very_late_amount is
  'Fine (PKR) for arriving more than 30 min late. Default 300.';
comment on column public.organization_settings.fine_uninformed_amount is
  'Fine (PKR) for uninformed absence. Default 500.';
comment on column public.organization_settings.informed_leaves_per_month is
  'Max informed leave days allowed per month. Default 2.';
comment on column public.organization_settings.shift_fulltime_start is
  'Full-time employee shift start in org local timezone. Default 09:00.';
comment on column public.organization_settings.shift_morning_start is
  'Part-time morning shift start. Default 09:00.';
comment on column public.organization_settings.shift_morning_end is
  'Part-time morning shift end. Default 13:00.';
comment on column public.organization_settings.shift_evening_start is
  'Part-time evening shift start. Default 13:00.';
comment on column public.organization_settings.shift_evening_end is
  'Part-time evening shift end. Default 17:30.';
