-- Template for backfilling sample daily_reports for one demo/test
-- employee, so dashboards, streaks, and completion trends show
-- realistic-looking data instead of being empty right after setup.
--
-- NOT run automatically (it's not a migration and not in supabase/seed.sql
-- — it needs a real employee to exist first, which only happens through
-- the app's invite flow). To use it:
--   1. Invite an employee through the app (People > Employees > Invite
--      Employee) and have them accept the invite so their profile exists.
--   2. Find their profile id: `select id, full_name from profiles;` in
--      the Supabase SQL Editor, or from their /admin/employees/[id] page
--      URL.
--   3. Paste this whole file into the SQL Editor, replace
--      target_employee_id below with that id, and run it.
--
-- Safe to re-run for the same employee: ON CONFLICT skips any day that
-- already has a report for them (daily_reports has a unique constraint
-- on (author_id, report_date)).

do $$
declare
  target_employee_id uuid := '00000000-0000-0000-0000-000000000000'; -- replace me
  days_back integer;
begin
  for days_back in 0..13 loop
    -- Skip weekends, and randomly skip ~15% of weekdays too — a
    -- suspiciously perfect 100% completion rate doesn't demo well.
    if extract(dow from (current_date - days_back)) not in (0, 6)
       and random() > 0.15 then
      insert into public.daily_reports (
        author_id, report_date, content, blockers, additional_notes, submitted_at
      )
      values (
        target_employee_id,
        current_date - days_back,
        'Worked on demo tasks for day ' || days_back || '.',
        case when random() < 0.2 then 'Waiting on a design review.' else null end,
        'Plan to continue this tomorrow.',
        (current_date - days_back)
          + time '09:00'
          + (random() * interval '9 hours')
      )
      on conflict (author_id, report_date) do nothing;
    end if;
  end loop;
end $$;
