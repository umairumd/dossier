-- Tasks: one owner per task (or open to a department / designation until
-- someone takes it), optional helpers, steps that can each have a person and
-- a date, and a history of updates (comments, status changes, notes from the
-- daily report). "Same task for each person" creates one task per person
-- sharing a group_id.
-- Writes go through server actions (service role) after permission checks.
-- Run after 20261029000010.

-- PART 1: Tables

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null
    constraint tasks_title_check check (char_length(btrim(title)) between 1 and 200),
  details_md text not null default ''
    constraint tasks_details_check check (char_length(details_md) <= 10000),
  status text not null default 'todo'
    constraint tasks_status_check check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null default 'normal'
    constraint tasks_priority_check check (priority in ('low', 'normal', 'high', 'urgent')),
  labels text[] not null default '{}'
    constraint tasks_labels_check check (cardinality(labels) <= 6),
  owner_id uuid references public.profiles (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  group_id uuid,
  due_date date,
  blocked_reason text
    constraint tasks_blocked_reason_check check (blocked_reason is null or char_length(blocked_reason) <= 300),
  position double precision not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  done_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_owner_open_idx on public.tasks (owner_id) where archived_at is null;
create index if not exists tasks_department_idx on public.tasks (department_id) where archived_at is null;
create index if not exists tasks_created_by_idx on public.tasks (created_by) where archived_at is null;
create index if not exists tasks_group_idx on public.tasks (group_id) where group_id is not null;
create index if not exists tasks_org_due_idx on public.tasks (organization_id, due_date)
  where archived_at is null and status <> 'done';

-- Who an unowned task is open to (until someone takes it).
create table if not exists public.task_audiences (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  kind text not null
    constraint task_audiences_kind_check check (kind in ('department', 'designation')),
  value text not null
);
create index if not exists task_audiences_task_idx on public.task_audiences (task_id);

create table if not exists public.task_helpers (
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, profile_id)
);
create index if not exists task_helpers_profile_idx on public.task_helpers (profile_id);

create table if not exists public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null
    constraint task_steps_title_check check (char_length(btrim(title)) between 1 and 200),
  done boolean not null default false,
  done_at timestamptz,
  owner_id uuid references public.profiles (id) on delete set null,
  due_date date,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists task_steps_task_idx on public.task_steps (task_id);
create index if not exists task_steps_owner_idx on public.task_steps (owner_id) where owner_id is not null;

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  kind text not null
    constraint task_updates_kind_check check (kind in ('comment', 'report', 'event')),
  body text not null default ''
    constraint task_updates_body_check check (char_length(body) <= 5000),
  meta jsonb,
  report_date date,
  created_at timestamptz not null default now()
);
create index if not exists task_updates_task_idx on public.task_updates (task_id, created_at);
create index if not exists task_updates_report_idx on public.task_updates (author_id, report_date)
  where report_date is not null;

-- PART 2: Who can read a task

create or replace function public.can_read_task(task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      me.role in ('owner', 'admin')
      or t.created_by = me.id
      or t.owner_id = me.id
      or exists (select 1 from public.task_helpers h where h.task_id = t.id and h.profile_id = me.id)
      or exists (select 1 from public.task_steps s where s.task_id = t.id and s.owner_id = me.id)
      -- Everyone in the task's department sees its board.
      or (t.department_id is not null and exists (
        select 1 from public.profile_departments pd
        where pd.profile_id = me.id and pd.department_id = t.department_id
      ))
      or (t.department_id is not null and exists (
        select 1 from public.departments d
        where d.id = t.department_id and d.manager_id = me.id
      ))
      -- The owner's managers and supervisors.
      or (t.owner_id is not null and exists (
        select 1
        from public.profile_departments pd
        join public.departments d on d.id = pd.department_id
        where pd.profile_id = t.owner_id and d.manager_id = me.id
      ))
      or (t.owner_id is not null and exists (
        select 1 from public.member_supervisors ms
        where ms.member_id = t.owner_id and ms.supervisor_id = me.id
      ))
      -- Open tasks: the people they are open to.
      or (t.owner_id is null and exists (
        select 1 from public.task_audiences a
        where a.task_id = t.id
          and (
            (a.kind = 'department' and exists (
              select 1 from public.profile_departments pd
              where pd.profile_id = me.id and pd.department_id::text = a.value
            ))
            or (a.kind = 'designation' and lower(btrim(a.value)) = lower(btrim(me.designation)))
          )
      ))
    from public.profiles me
    join public.tasks t
      on t.id = can_read_task.task_id
     and t.organization_id = me.organization_id
    where me.id = (select auth.uid())
  ), false);
$$;

revoke all on function public.can_read_task(uuid) from public;
grant execute on function public.can_read_task(uuid) to authenticated;

-- PART 3: RLS (reads only; writes go through server actions)

alter table public.tasks enable row level security;
alter table public.task_audiences enable row level security;
alter table public.task_helpers enable row level security;
alter table public.task_steps enable row level security;
alter table public.task_updates enable row level security;

create policy tasks_select on public.tasks for select to authenticated
  using ((select public.can_read_task(id)));
create policy task_audiences_select on public.task_audiences for select to authenticated
  using ((select public.can_read_task(task_id)));
create policy task_helpers_select on public.task_helpers for select to authenticated
  using ((select public.can_read_task(task_id)));
create policy task_steps_select on public.task_steps for select to authenticated
  using ((select public.can_read_task(task_id)));
create policy task_updates_select on public.task_updates for select to authenticated
  using ((select public.can_read_task(task_id)));

revoke insert, update, delete on public.tasks from anon, authenticated;
revoke insert, update, delete on public.task_audiences from anon, authenticated;
revoke insert, update, delete on public.task_helpers from anon, authenticated;
revoke insert, update, delete on public.task_steps from anon, authenticated;
revoke insert, update, delete on public.task_updates from anon, authenticated;
