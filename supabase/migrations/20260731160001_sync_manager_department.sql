-- Closes a gap surfaced while building the Manager Dashboard: RLS's
-- manager-scoped policies (profiles_select_department_as_manager,
-- daily_reports_select_department_as_manager) key off the manager's own
-- profiles.department_id, NOT off departments.manager_id. Those two are
-- different columns with nothing keeping them in sync — an admin could
-- name someone as a department's manager (departments.manager_id) without
-- that profile's own department_id ever being set to match, leaving that
-- manager able to see zero employees and zero reports despite being the
-- named manager. This trigger makes the assignment the single action that
-- updates both.
--
-- Scoped one-directionally (departments.manager_id -> profiles.department_id)
-- since that's the actual admin action ("assign this manager to this
-- department"); there's no admin UI yet that edits profiles.department_id
-- directly, so the reverse direction has no real trigger case to handle.

create function public.sync_manager_profile_department()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.manager_id is not null then
    update public.profiles
    set department_id = new.id
    where id = new.manager_id
      and department_id is distinct from new.id;
  end if;

  return new;
end;
$$;

comment on function public.sync_manager_profile_department() is
  'Keeps a manager''s own profiles.department_id in sync with departments.manager_id whenever a department''s manager is assigned or changed.';

create trigger departments_sync_manager_department
  after insert or update of manager_id on public.departments
  for each row
  execute function public.sync_manager_profile_department();
