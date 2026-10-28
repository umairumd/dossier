-- Handbook: policies, SOPs, job descriptions and guides; who can read each
-- one; who has confirmed reading which version.
-- Audiences add up: a person can read a published doc when they match any
-- one of its audience rows. Owners and admins can read every doc in their
-- organization, drafts included.
-- Run after 20261028000009 (handbook enum values).

-- PART 1: profiles.ask_me_about

alter table public.profiles
  add column if not exists ask_me_about text
    constraint profiles_ask_me_about_length
    check (ask_me_about is null or char_length(ask_me_about) <= 80);

comment on column public.profiles.ask_me_about is
  'Short "ask me about" line shown in the handbook''s Who to ask card, e.g. "Leave, attendance and payroll". Set by owners and admins.';

-- profiles_update_own lets people edit their own row, so the column is
-- guarded here. The service role (no auth.uid()) is not restricted.
create or replace function public.enforce_profile_ask_me_about()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ask_me_about is distinct from old.ask_me_about
     and (select auth.uid()) is not null
     and coalesce((select public.current_profile_role()), '') not in ('owner', 'admin') then
    raise exception 'ask_me_about can only be changed by an owner or admin';
  end if;
  return new;
end;
$$;

create trigger profiles_ask_me_about_guard
  before update of ask_me_about on public.profiles
  for each row
  execute function public.enforce_profile_ask_me_about();

-- PART 2: Who to ask for every role
-- The directory policy from 20261028000004 was limited to members. Managers
-- and supervisors see the handbook's Who to ask card too.

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
      select me.organization_id from public.profiles me
      where me.id = (select auth.uid())
    )
      and p.role in ('owner', 'admin')
    union
    select d.manager_id
    from public.departments d
    join public.profile_departments pd on pd.department_id = d.id
    where pd.profile_id = (select auth.uid())
      and d.manager_id is not null
    union
    select ms.supervisor_id
    from public.member_supervisors ms
    where ms.member_id = (select auth.uid())
  ) x
  where x.id is not null;
$$;

drop policy if exists profiles_select_directory_as_member on public.profiles;

create policy profiles_select_directory_as_member
  on public.profiles for select
  to authenticated
  using (
    is_active = true
    and archived_at is null
    and id in (select unnest(public.my_directory_profile_ids()))
  );

-- PART 3: Tables

create table public.handbook_docs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind            text not null
    constraint handbook_docs_kind_check
    check (kind in ('policy', 'sop', 'jd', 'guide')),
  title           text not null
    constraint handbook_docs_title_check
    check (char_length(btrim(title)) between 1 and 160),
  slug            text not null
    constraint handbook_docs_slug_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary         text,
  body_md         text not null default '',   -- published text
  draft_md        text not null default '',   -- working copy
  version         integer not null default 0  -- 0 = never published
    constraint handbook_docs_version_check check (version >= 0),
  change_note     text,                       -- what changed in this version
  requires_ack    boolean not null default false,
  start_here      boolean not null default false,
  owner_id        uuid references public.profiles (id) on delete set null,
  jd_designation  text,                       -- kind = 'jd' only
  published_at    timestamptz,
  published_by    uuid references public.profiles (id) on delete set null,
  reminded_at     timestamptz,                -- last "remind who haven't read it"
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,
  -- Also serves lookups by organization_id (leading column).
  constraint handbook_docs_org_slug_key unique (organization_id, slug)
);

comment on table public.handbook_docs is
  'Handbook documents. body_md is what readers see; draft_md is edited until publish copies it over and bumps version.';

create trigger handbook_docs_set_updated_at
  before update on public.handbook_docs
  for each row execute function public.set_updated_at();

create table public.handbook_doc_audiences (
  id         uuid primary key default gen_random_uuid(),
  doc_id     uuid not null references public.handbook_docs (id) on delete cascade,
  kind       text not null
    constraint handbook_doc_audiences_kind_check
    check (kind in (
      'everyone', 'department', 'role', 'designation',
      'employment_type', 'work_location', 'profile'
    )),
  -- department id, role, designation, 'full_time' / 'part_time',
  -- 'remote' / 'on_site', or profile id. Null for 'everyone'.
  value      text,
  created_at timestamptz not null default now(),
  constraint handbook_doc_audiences_value_check check (
    (kind = 'everyone' and value is null)
    or (kind = 'role'
        and value in ('owner', 'admin', 'manager', 'supervisor', 'member'))
    or (kind = 'employment_type' and value in ('full_time', 'part_time'))
    or (kind = 'work_location' and value in ('remote', 'on_site'))
    or (kind in ('department', 'designation', 'profile')
        and value is not null and char_length(btrim(value)) > 0)
  )
);

comment on table public.handbook_doc_audiences is
  'Who can read a handbook doc. Rows add up (match any). A JD with no rows is read by people whose designation matches jd_designation.';

-- Also serves lookups by doc_id (leading column).
create unique index handbook_doc_audiences_doc_rule_key
  on public.handbook_doc_audiences (doc_id, kind, coalesce(value, ''));

create table public.handbook_acks (
  id              uuid primary key default gen_random_uuid(),
  doc_id          uuid not null references public.handbook_docs (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  version         integer not null
    constraint handbook_acks_version_check check (version > 0),
  acknowledged_at timestamptz not null default now(),
  -- Also serves lookups by doc_id (leading column).
  constraint handbook_acks_doc_profile_version_key unique (doc_id, profile_id, version)
);

comment on table public.handbook_acks is
  'One row per person per doc version they confirmed (requires_ack) or opened (other docs).';

create index handbook_acks_profile_doc_idx
  on public.handbook_acks (profile_id, doc_id);

-- PART 4: Who can read a doc

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

comment on function public.can_read_handbook_doc(uuid) is
  'True when the signed-in user may read the handbook doc: owners and admins of its organization always; others when it is published, not archived, and they match at least one audience row.';

revoke all on function public.can_read_handbook_doc(uuid) from public;
grant execute on function public.can_read_handbook_doc(uuid) to authenticated;

-- PART 5: RLS

alter table public.handbook_docs enable row level security;
alter table public.handbook_doc_audiences enable row level security;
alter table public.handbook_acks enable row level security;

-- handbook_docs

create policy handbook_docs_select
  on public.handbook_docs for select
  to authenticated
  using (
    organization_id = (
      select p.organization_id from public.profiles p
      where p.id = (select auth.uid())
    )
    and (select public.can_read_handbook_doc(id))
  );

create policy handbook_docs_insert_as_owner_admin
  on public.handbook_docs for insert
  to authenticated
  with check (
    (select public.current_profile_role()) in ('owner', 'admin')
    and organization_id = (
      select p.organization_id from public.profiles p
      where p.id = (select auth.uid())
    )
  );

create policy handbook_docs_update_as_owner_admin
  on public.handbook_docs for update
  to authenticated
  using (
    (select public.current_profile_role()) in ('owner', 'admin')
    and organization_id = (
      select p.organization_id from public.profiles p
      where p.id = (select auth.uid())
    )
  )
  with check (
    (select public.current_profile_role()) in ('owner', 'admin')
    and organization_id = (
      select p.organization_id from public.profiles p
      where p.id = (select auth.uid())
    )
  );

create policy handbook_docs_delete_as_owner_admin
  on public.handbook_docs for delete
  to authenticated
  using (
    (select public.current_profile_role()) in ('owner', 'admin')
    and organization_id = (
      select p.organization_id from public.profiles p
      where p.id = (select auth.uid())
    )
  );

-- handbook_doc_audiences

create policy handbook_doc_audiences_select_as_owner_admin
  on public.handbook_doc_audiences for select
  to authenticated
  using (
    (select public.current_profile_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.handbook_docs d
      where d.id = handbook_doc_audiences.doc_id
        and d.organization_id = (
          select p.organization_id from public.profiles p
          where p.id = (select auth.uid())
        )
    )
  );

create policy handbook_doc_audiences_select_as_reader
  on public.handbook_doc_audiences for select
  to authenticated
  using ((select public.can_read_handbook_doc(doc_id)));

create policy handbook_doc_audiences_insert_as_owner_admin
  on public.handbook_doc_audiences for insert
  to authenticated
  with check (
    (select public.current_profile_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.handbook_docs d
      where d.id = handbook_doc_audiences.doc_id
        and d.organization_id = (
          select p.organization_id from public.profiles p
          where p.id = (select auth.uid())
        )
    )
  );

create policy handbook_doc_audiences_update_as_owner_admin
  on public.handbook_doc_audiences for update
  to authenticated
  using (
    (select public.current_profile_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.handbook_docs d
      where d.id = handbook_doc_audiences.doc_id
        and d.organization_id = (
          select p.organization_id from public.profiles p
          where p.id = (select auth.uid())
        )
    )
  )
  with check (
    (select public.current_profile_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.handbook_docs d
      where d.id = handbook_doc_audiences.doc_id
        and d.organization_id = (
          select p.organization_id from public.profiles p
          where p.id = (select auth.uid())
        )
    )
  );

create policy handbook_doc_audiences_delete_as_owner_admin
  on public.handbook_doc_audiences for delete
  to authenticated
  using (
    (select public.current_profile_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.handbook_docs d
      where d.id = handbook_doc_audiences.doc_id
        and d.organization_id = (
          select p.organization_id from public.profiles p
          where p.id = (select auth.uid())
        )
    )
  );

-- handbook_acks: people confirm their own reads; no updates or deletes.

create policy handbook_acks_select_own
  on public.handbook_acks for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy handbook_acks_select_as_owner_admin
  on public.handbook_acks for select
  to authenticated
  using (
    (select public.current_profile_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.handbook_docs d
      where d.id = handbook_acks.doc_id
        and d.organization_id = (
          select p.organization_id from public.profiles p
          where p.id = (select auth.uid())
        )
    )
  );

-- Only the doc's current published version, and only docs the person can
-- read (the handbook_docs select policy applies inside the subquery).
create policy handbook_acks_insert_own
  on public.handbook_acks for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.handbook_docs d
      where d.id = handbook_acks.doc_id
        and d.version = handbook_acks.version
        and d.version > 0
        and d.archived_at is null
    )
  );
