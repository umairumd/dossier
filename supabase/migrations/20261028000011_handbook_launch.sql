-- Handbook launch switch. Until the handbook is launched only owners and
-- admins can read it; everyone else sees "Coming soon".

alter table public.organization_settings
  add column if not exists handbook_launched_at timestamptz;

comment on column public.organization_settings.handbook_launched_at is
  'When the handbook was opened to everyone. Null = only owners and admins can read it.';

create or replace function public.can_read_handbook_doc(doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      case
        when me.role in ('owner', 'admin') then true
        when not exists (
          select 1 from public.organization_settings s
          where s.handbook_launched_at is not null
        ) then false
        when d.version = 0 or d.archived_at is not null then false
        when exists (
          select 1
          from public.handbook_doc_audiences a
          where a.doc_id = d.id
            and (
              a.kind = 'everyone'
              or (a.kind = 'profile' and a.value = me.id::text)
              or (a.kind = 'role' and (
                a.value = me.role
                or (a.value = 'supervisor' and exists (
                  select 1 from public.member_supervisors ms
                  where ms.supervisor_id = me.id
                ))
              ))
              or (a.kind = 'department' and exists (
                select 1 from public.profile_departments pd
                where pd.profile_id = me.id
                  and pd.department_id::text = a.value
              ))
              or (a.kind = 'designation'
                  and lower(btrim(a.value)) = lower(btrim(me.designation)))
              or (a.kind = 'employment_type' and a.value = me.employment_type)
              or (a.kind = 'work_location'
                  and a.value = case when me.is_remote then 'remote' else 'on_site' end)
            )
        ) then true
        else (
          d.kind = 'jd'
          and btrim(d.jd_designation) <> ''
          and lower(btrim(d.jd_designation)) = lower(btrim(me.designation))
          and not exists (
            select 1 from public.handbook_doc_audiences a
            where a.doc_id = d.id
          )
        )
      end
    from public.profiles me
    join public.handbook_docs d
      on d.id = can_read_handbook_doc.doc_id
     and d.organization_id = me.organization_id
    where me.id = (select auth.uid())
  ), false);
$$;
