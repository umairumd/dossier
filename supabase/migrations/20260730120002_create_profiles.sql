-- Profiles: app-level identity extending auth.users with role and
-- department. Every authorization decision in this schema traces back to
-- this table's role and department_id columns.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null,
  department_id uuid references public.departments (id),
  created_at timestamptz not null default now(),

  constraint profiles_role_check check (role in ('employee', 'manager', 'admin')),

  -- Admins aren't scoped to a department; employees and managers must be.
  constraint profiles_department_required_check check (
    role = 'admin' or department_id is not null
  )
);

comment on table public.profiles is
  'App identity for an auth.users row: role (employee/manager/admin) and department. The single source of truth every RLS policy in this schema keys off.';

create index profiles_department_id_idx on public.profiles (department_id);
