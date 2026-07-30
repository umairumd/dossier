-- Adds the Blockers and Additional Notes fields introduced by the daily
-- report submission form. The original schema only anticipated a single
-- narrative "content" field; these are split into their own columns
-- (rather than concatenated into content) so they stay independently
-- queryable and displayable — e.g. surfacing blockers on their own in a
-- future manager view — without parsing a blob of freeform text.

alter table public.daily_reports
  add column blockers text,
  add column additional_notes text;

comment on column public.daily_reports.content is
  'Answer to "What did you work on today?" — required.';
comment on column public.daily_reports.blockers is
  'Optional blockers reported alongside the daily report.';
comment on column public.daily_reports.additional_notes is
  'Optional freeform notes reported alongside the daily report.';
