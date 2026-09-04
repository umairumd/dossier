-- Report Templates System
-- Migration 011

-- 1. Templates table
create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,
  name text not null,
  description text,
  is_default boolean not null default false,
  created_by uuid
    references public.profiles(id)
    on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.report_templates is
  'Report submission templates. One default per org. Archived templates are never deleted — historical reports reference them for correct display.';

create unique index report_templates_one_default_per_org
  on public.report_templates(organization_id)
  where is_default = true and archived_at is null;

-- 2. Template fields table
create table public.template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.report_templates(id)
    on delete cascade,
  key text not null,
  label text not null,
  placeholder text,
  field_type text not null check (field_type in (
    'textarea',
    'text',
    'number',
    'select',
    'checkbox',
    'url'
  )),
  is_required boolean not null default false,
  is_preview boolean not null default false,
  field_order smallint not null,
  options jsonb,
  unit text,
  min_value numeric,
  max_value numeric,
  created_at timestamptz not null default now(),
  unique(template_id, key)
);

comment on table public.template_fields is
  'Fields belonging to a report template. field_order determines render order in the form. is_preview: one field shown as summary in report lists. options: jsonb array of strings for select type. unit: suffix label for number type (e.g. hours, %).';

-- 3. Add template_id to departments
alter table public.departments
  add column template_id uuid
    references public.report_templates(id)
    on delete set null;

comment on column public.departments.template_id is
  'Report template for this department. Overrides org default. Individual profile.template_id overrides this.';

-- 4. Add template_id to profiles
alter table public.profiles
  add column template_id uuid
    references public.report_templates(id)
    on delete set null;

comment on column public.profiles.template_id is
  'Individual report template override. Takes priority over department and org default.';

-- 5. Extend daily_reports
alter table public.daily_reports
  add column template_id uuid
    references public.report_templates(id)
    on delete set null,
  add column field_responses jsonb;

comment on column public.daily_reports.template_id is
  'Template used at time of submission. Null = legacy report using content/blockers/additional_notes columns directly. Never changes after submission.';

comment on column public.daily_reports.field_responses is
  'JSONB map of field key → submitted value. Keys match template_fields.key for the template referenced by template_id. Null for legacy reports.';

-- 6. RLS: enable before policies
alter table public.report_templates enable row level security;
alter table public.template_fields enable row level security;

create policy report_templates_select_authenticated
  on public.report_templates for select
  using (auth.uid() is not null);

create policy report_templates_write_as_admin
  on public.report_templates for insert
  with check (
    public.current_profile_role() in ('owner', 'admin')
  );

create policy report_templates_update_as_admin
  on public.report_templates for update
  using (
    public.current_profile_role() in ('owner', 'admin')
  );

create policy report_templates_delete_as_admin
  on public.report_templates for delete
  using (
    public.current_profile_role() in ('owner', 'admin')
  );

create policy template_fields_select_authenticated
  on public.template_fields for select
  using (auth.uid() is not null);

create policy template_fields_write_as_admin
  on public.template_fields for insert
  with check (
    public.current_profile_role() in ('owner', 'admin')
  );

create policy template_fields_update_as_admin
  on public.template_fields for update
  using (
    public.current_profile_role() in ('owner', 'admin')
  );

create policy template_fields_delete_as_admin
  on public.template_fields for delete
  using (
    public.current_profile_role() in ('owner', 'admin')
  );

-- 7. Seed default template for Inoma Digital
do $$
declare
  tmpl_id uuid;
begin
  insert into public.report_templates (
    organization_id,
    name,
    description,
    is_default,
    created_by
  ) values (
    '8254ff8c-19df-4f0b-9b96-6eef6c266c8d',
    'Default',
    'Standard daily report template. Used by everyone without a specific template.',
    true,
    '585921a1-c8aa-4427-96e1-9cf475734677'
  );

  select id into strict tmpl_id
  from public.report_templates
  where organization_id = '8254ff8c-19df-4f0b-9b96-6eef6c266c8d'
    and is_default = true
    and archived_at is null;

  insert into public.template_fields (
    template_id, key, label, placeholder,
    field_type, is_required, is_preview,
    field_order
  ) values
  (
    tmpl_id,
    'content',
    'Accomplishments',
    'What did you work on today?',
    'textarea',
    true,
    true,
    0
  ),
  (
    tmpl_id,
    'blockers',
    'Blockers',
    'Any blockers or challenges?',
    'textarea',
    false,
    false,
    1
  ),
  (
    tmpl_id,
    'additional_notes',
    'Tomorrow''s Plan',
    'What are you planning for tomorrow?',
    'textarea',
    false,
    false,
    2
  );
end $$;
