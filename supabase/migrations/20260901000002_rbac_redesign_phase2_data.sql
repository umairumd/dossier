-- RBAC redesign phase 2: data only. Relies on
-- 20260901000001_rbac_redesign_phase1.sql (organizations, organization_id,
-- profile_departments, expanded role check). No schema changes.

-- PART 1: Backfill organization_id

update public.profiles
set organization_id = (
  select id from public.organizations where slug = 'inoma-digital'
);

update public.departments
set organization_id = (
  select id from public.organizations where slug = 'inoma-digital'
);

-- PART 2: Copy profiles.department_id into the junction table

insert into public.profile_departments (profile_id, department_id)
select id, department_id
from public.profiles
where department_id is not null
on conflict do nothing;

-- PART 3: Role updates

update public.profiles
set role = 'owner'
where id = '585921a1-c8aa-4427-96e1-9cf475734677';

update public.profiles
set role = 'member'
where role = 'employee';

-- PART 4: Delete demo/test auth users (cascades to profiles, then daily_reports)

delete from auth.users
where email like '%@demo.inoma.local'
   or email = 'raveehasajid028@gmail.com'
   or email = 'raveehasajid2894@gmail.com'
   or (
     email like '%@gmail.com'
     and id in (
       select p.id from public.profiles p
       join auth.users u on u.id = p.id
       where p.full_name = 'Umair Umar'
         and p.id != '585921a1-c8aa-4427-96e1-9cf475734677'
     )
   );

-- PART 5: Manual verification (run after apply)

-- Verify org backfill:
-- select count(*) from profiles where organization_id is null;
-- select count(*) from departments where organization_id is null;

-- Verify junction table populated:
-- select count(*) from profile_departments;

-- Verify role distribution:
-- select role, count(*) from profiles group by role;

-- Verify owner exists:
-- select id, full_name, role from profiles
-- where id = '585921a1-c8aa-4427-96e1-9cf475734677';
