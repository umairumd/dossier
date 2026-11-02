-- Audience rules for announcements and the handbook: different kinds narrow,
-- the same kind widens, people are added.
--
--   Marketing + Project Manager  -> project managers in Marketing
--   Marketing + Development      -> people in either department
--   ... + a person               -> that person as well
--
-- Before this, every rule was joined with OR, so Marketing + Project Manager
-- reached all of Marketing and every project manager. The app's own copy of
-- the rule is matchesHandbookAudience() in lib/handbook/audience.ts.

-- PART 1: one rule against one person

create or replace function public.audience_rule_matches(
  rule_kind text,
  rule_value text,
  person_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case rule_kind
      when 'everyone' then true
      when 'profile' then rule_value = me.id::text
      when 'role' then (
        rule_value = me.role
        or (rule_value = 'supervisor' and exists (
          select 1 from public.member_supervisors ms
          where ms.supervisor_id = me.id
        ))
      )
      when 'department' then exists (
        select 1 from public.profile_departments pd
        where pd.profile_id = me.id
          and pd.department_id::text = rule_value
      )
      when 'designation' then
        btrim(coalesce(me.designation, '')) <> ''
        and lower(btrim(rule_value)) = lower(btrim(me.designation))
      when 'employment_type' then rule_value = me.employment_type
      when 'work_location' then
        rule_value = case when me.is_remote then 'remote' else 'on_site' end
      else false
    end
    from public.profiles me
    where me.id = person_id
  ), false);
$$;

revoke all on function public.audience_rule_matches(text, text, uuid) from public;
grant execute on function public.audience_rule_matches(text, text, uuid) to authenticated;

-- PART 2: a set of rules ({kind, value} rows as jsonb) against one person

create or replace function public.audience_matches(rules jsonb, person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select x->>'kind' as kind, x->>'value' as value
    from jsonb_array_elements(coalesce(rules, '[]'::jsonb)) as x
  )
  select
    -- Everyone, or named directly.
    exists (select 1 from r where r.kind = 'everyone')
    or exists (select 1 from r where r.kind = 'profile' and r.value = person_id::text)
    -- Or at least one group rule, and every kind of group rule matches once.
    or (
      exists (select 1 from r where r.kind not in ('everyone', 'profile'))
      and not exists (
        select 1
        from (select distinct kind from r where kind not in ('everyone', 'profile')) k
        where not exists (
          select 1 from r r2
          where r2.kind = k.kind
            and public.audience_rule_matches(r2.kind, r2.value, person_id)
        )
      )
    );
$$;

revoke all on function public.audience_matches(jsonb, uuid) from public;
grant execute on function public.audience_matches(jsonb, uuid) to authenticated;

-- PART 3: handbook documents

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
          select 1 from public.handbook_doc_audiences a where a.doc_id = d.id
        ) then public.audience_matches(
          (
            select jsonb_agg(jsonb_build_object('kind', a.kind, 'value', a.value))
            from public.handbook_doc_audiences a
            where a.doc_id = d.id
          ),
          me.id
        )
        else (
          -- A job description with no audience: people with that designation.
          d.kind = 'jd'
          and btrim(d.jd_designation) <> ''
          and lower(btrim(d.jd_designation)) = lower(btrim(me.designation))
        )
      end
    from public.profiles me
    join public.handbook_docs d
      on d.id = can_read_handbook_doc.doc_id
     and d.organization_id = me.organization_id
    where me.id = (select auth.uid())
  ), false);
$$;

-- PART 4: notices

create or replace function public.can_read_notice(notice_id uuid)
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
        when n.created_by = me.id then true
        when n.published_at is null or n.archived_at is not null then false
        when n.kind = 'personal' then (
          n.target_profile_id = me.id
          or exists (
            select 1
            from public.profile_departments pd
            join public.departments d on d.id = pd.department_id
            where pd.profile_id = n.target_profile_id
              and d.manager_id = me.id
          )
          or exists (
            select 1 from public.member_supervisors ms
            where ms.member_id = n.target_profile_id
              and ms.supervisor_id = me.id
          )
        )
        else public.audience_matches(
          (
            select jsonb_agg(jsonb_build_object('kind', a.kind, 'value', a.value))
            from public.notice_audiences a
            where a.notice_id = n.id
          ),
          me.id
        )
      end
    from public.profiles me
    join public.notices n
      on n.id = can_read_notice.notice_id
     and n.organization_id = me.organization_id
    where me.id = (select auth.uid())
  ), false);
$$;
