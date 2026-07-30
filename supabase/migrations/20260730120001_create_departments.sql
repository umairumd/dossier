-- Departments: the team boundary that scopes manager visibility.
-- manager_id has no foreign key yet — profiles doesn't exist until the next
-- migration, and profiles.department_id references departments, so the
-- manager_id -> profiles link is added afterward in
-- 20260730120003_link_departments_manager.sql to avoid a circular
-- dependency between the two CREATE TABLE statements.

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manager_id uuid,
  created_at timestamptz not null default now(),

  constraint departments_name_key unique (name),
  constraint departments_manager_id_key unique (manager_id)
);

comment on table public.departments is
  'Teams that scope manager visibility over daily_reports. One manager per department, enforced by the unique manager_id constraint.';
