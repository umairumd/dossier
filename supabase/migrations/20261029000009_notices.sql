-- Notices shown in For you on Home.
--   announcement: to a group, picked with the same audience rules as the
--                 handbook; people dismiss it or acknowledge it.
--   personal:     to one person (for example a note from HR); always
--                 acknowledged, kept on their profile.
-- Writes go through server actions (service role) after role checks; people
-- record their own seen / dismissed / acknowledged state.
-- Automatic notices are worked out on the server from live data; only their
-- on/off switch and threshold are stored here (notice_rules).
-- Run after 20261029000008.

-- PART 1: Tables

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null
    constraint notices_kind_check check (kind in ('announcement', 'personal')),
  title text not null
    constraint notices_title_check check (char_length(btrim(title)) between 1 and 160),
  body_md text not null default ''
    constraint notices_body_check check (char_length(body_md) <= 5000),
  created_by uuid references public.profiles (id) on delete set null,
  target_profile_id uuid references public.profiles (id) on delete cascade,
  requires_ack boolean not null default false,
  pinned_until date,
  ends_at date,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notices_personal_target check (
    (kind = 'personal' and target_profile_id is not null and requires_ack)
    or (kind = 'announcement' and target_profile_id is null)
  )
);

create index if not exists notices_org_published_idx
  on public.notices (organization_id, published_at desc)
  where archived_at is null;
create index if not exists notices_target_idx
  on public.notices (target_profile_id)
  where target_profile_id is not null;

create table if not exists public.notice_audiences (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices (id) on delete cascade,
  kind text not null
    constraint notice_audiences_kind_check check (
      kind in ('everyone', 'department', 'role', 'designation', 'employment_type', 'work_location', 'profile')
    ),
  value text,
  constraint notice_audiences_value_check check ((kind = 'everyone') = (value is null))
);

create index if not exists notice_audiences_notice_idx on public.notice_audiences (notice_id);

create table if not exists public.notice_receipts (
  notice_id uuid not null references public.notices (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now(),
  dismissed_at timestamptz,
  acknowledged_at timestamptz,
  primary key (notice_id, profile_id)
);

create index if not exists notice_receipts_profile_idx on public.notice_receipts (profile_id);

create table if not exists public.notice_rules (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  rule text not null,
  enabled boolean not null,
  threshold integer
    constraint notice_rules_threshold_check check (threshold is null or threshold between 1 and 60),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, rule)
);

-- Dismissed automatic notices. The key carries the period it applies to
-- (for example "leave_low:2026-10"), so a notice can come back later.
create table if not exists public.notice_rule_dismissals (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  key text not null
    constraint notice_rule_dismissals_key_check check (char_length(key) <= 120),
  dismissed_at timestamptz not null default now(),
  primary key (profile_id, key)
);

-- PART 2: Who can read a notice

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
        else exists (
          select 1
          from public.notice_audiences a
          where a.notice_id = n.id
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
        )
      end
    from public.profiles me
    join public.notices n
      on n.id = can_read_notice.notice_id
     and n.organization_id = me.organization_id
    where me.id = (select auth.uid())
  ), false);
$$;

comment on function public.can_read_notice(uuid) is
  'True when the signed-in user may read the notice: owners, admins and its author always; personal notices also the person and their managers and supervisors; announcements anyone matching an audience row, once published.';

revoke all on function public.can_read_notice(uuid) from public;
grant execute on function public.can_read_notice(uuid) to authenticated;

-- PART 3: RLS

alter table public.notices enable row level security;
alter table public.notice_audiences enable row level security;
alter table public.notice_receipts enable row level security;
alter table public.notice_rules enable row level security;
alter table public.notice_rule_dismissals enable row level security;

create policy notices_select
  on public.notices for select
  to authenticated
  using ((select public.can_read_notice(id)));

create policy notice_audiences_select
  on public.notice_audiences for select
  to authenticated
  using ((select public.can_read_notice(notice_id)));

-- Your own receipts; the author, owners and admins see everyone's.
create policy notice_receipts_select
  on public.notice_receipts for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1 from public.notices n
      where n.id = notice_receipts.notice_id
        and (
          n.created_by = (select auth.uid())
          or (
            (select public.current_profile_role()) in ('owner', 'admin')
            and n.organization_id = (
              select p.organization_id from public.profiles p where p.id = (select auth.uid())
            )
          )
        )
    )
  );

create policy notice_receipts_insert_own
  on public.notice_receipts for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and (select public.can_read_notice(notice_id))
  );

create policy notice_receipts_update_own
  on public.notice_receipts for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy notice_rules_select_org
  on public.notice_rules for select
  to authenticated
  using (
    organization_id = (
      select p.organization_id from public.profiles p where p.id = (select auth.uid())
    )
  );

create policy notice_rule_dismissals_own
  on public.notice_rule_dismissals for all
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

revoke insert, update, delete on public.notices from anon, authenticated;
revoke insert, update, delete on public.notice_audiences from anon, authenticated;
revoke insert, update, delete on public.notice_rules from anon, authenticated;
revoke delete on public.notice_receipts from anon, authenticated;
