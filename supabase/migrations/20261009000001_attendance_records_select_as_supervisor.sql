-- Supervisors could read the profiles and reports of the people they
-- supervise, but not their attendance, so those people showed an empty
-- row in the team attendance grid. This includes a manager who
-- supervises someone outside their own departments. Read-only, matching
-- daily_reports_select_as_supervisor.

create policy attendance_records_select_as_supervisor
  on public.attendance_records for select
  using (
    exists (
      select 1 from public.member_supervisors ms
      where ms.supervisor_id = auth.uid()
        and ms.member_id = attendance_records.profile_id
    )
  );
