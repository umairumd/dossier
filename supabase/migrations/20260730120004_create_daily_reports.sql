-- Daily reports: the core entity. One immutable submission per employee per
-- day. Department scoping is derived through author_id -> profiles rather
-- than duplicated onto this table, so a report stays correctly scoped to
-- the department the author belonged to conceptually, without drifting
-- from profiles as the single source of truth.

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  report_date date not null,
  content text not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint daily_reports_author_date_key unique (author_id, report_date)
);

comment on table public.daily_reports is
  'One immutable end-of-day report per employee per day. No update/delete policy exists for any role — history is permanent by design.';

-- Backs the unique constraint above and is also the primary access pattern
-- (an employee's own report history).
create index daily_reports_author_id_report_date_idx
  on public.daily_reports (author_id, report_date);

-- Backs the Missing Reports view: "all reports on date X across a
-- department", which queries by date rather than by author.
create index daily_reports_report_date_idx
  on public.daily_reports (report_date);
