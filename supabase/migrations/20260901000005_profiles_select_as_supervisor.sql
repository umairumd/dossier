-- Additive SELECT so a supervisor can read profiles of people they
-- supervise. Queries member_supervisors from a profiles policy (not from
-- a member_supervisors policy), matching daily_reports_select_as_supervisor.

create policy profiles_select_as_supervisor
  on public.profiles for select
  using (
    exists (
      select 1 from public.member_supervisors ms
      where ms.supervisor_id = auth.uid()
        and ms.member_id = profiles.id
    )
  );
