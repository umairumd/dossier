-- Expand the singleton organization_settings row with display name,
-- IANA timezone, working-day set, and a local-hour deadline column.
-- report_deadline_hour_utc is left in place for backward compatibility.

alter table public.organization_settings
  add column org_name text,
  add column timezone text not null default 'UTC',
  add column working_days integer[] not null default '{1,2,3,4,5}',
  add column report_deadline_hour_local smallint not null default 17
    check (report_deadline_hour_local >= 0 and report_deadline_hour_local <= 23);

comment on column public.organization_settings.org_name is
  'Display name for the organization. Null uses the organizations table name.';
comment on column public.organization_settings.timezone is
  'IANA timezone string e.g. Asia/Karachi. Deadline is evaluated in this timezone.';
comment on column public.organization_settings.working_days is
  'Array of ISO weekday numbers (1=Mon … 7=Sun). Default Mon-Fri. Days outside this set are not counted as missed report days.';
comment on column public.organization_settings.report_deadline_hour_local is
  'Deadline hour in the org timezone (0-23). Replaces report_deadline_hour_utc which stays for backward compatibility.';
