-- Let plain members resolve profiles for Home "Your people":
-- org owners/admins, their department manager(s), and their supervisors.
-- Uses a security-definer helper so the policy does not recurse through
-- RLS-protected tables.

create or replace function public.my_directory_profile_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct x.id), '{}')
  from (
    select p.id
    from public.profiles p
    where p.organization_id = (
      select me.organization_id from public.profiles me where me.id = auth.uid()
    )
      and p.role in ('owner', 'admin')
    union
    select d.manager_id
    from public.departments d
    join public.profile_departments pd on pd.department_id = d.id
    where pd.profile_id = auth.uid()
      and d.manager_id is not null
    union
    select ms.supervisor_id
    from public.member_supervisors ms
    where ms.member_id = auth.uid()
  ) x
  where x.id is not null;
$$;

revoke all on function public.my_directory_profile_ids() from public;
grant execute on function public.my_directory_profile_ids() to authenticated;

create policy profiles_select_directory_as_member
  on public.profiles for select
  to authenticated
  using (
    public.current_profile_role() = 'member'
    and is_active = true
    and archived_at is null
    and id in (select unnest(public.my_directory_profile_ids()))
  );
