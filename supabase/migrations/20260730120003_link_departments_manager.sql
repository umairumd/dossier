-- Completes the departments <-> profiles relationship now that profiles
-- exists. A plain foreign key can guarantee manager_id points at *some*
-- profile, but it can't guarantee that profile has role = 'manager' — that
-- requires a trigger, since a FK can only constrain existence, not the
-- value of another column on the referenced row.

alter table public.departments
  add constraint departments_manager_id_fkey
  foreign key (manager_id) references public.profiles (id)
  on delete set null;

create function public.enforce_department_manager_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.manager_id is not null then
    if not exists (
      select 1 from public.profiles
      where id = new.manager_id
        and role = 'manager'
    ) then
      raise exception
        'departments.manager_id (%) must reference a profile with role = manager',
        new.manager_id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.enforce_department_manager_role() is
  'Guards departments.manager_id: only a profile with role = manager may be assigned as a department manager.';

create trigger departments_manager_role_check
  before insert or update of manager_id on public.departments
  for each row
  execute function public.enforce_department_manager_role();
