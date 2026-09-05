alter table public.profiles
  add column employment_type text
    check (employment_type in ('full_time', 'part_time'))
    not null default 'full_time';

comment on column public.profiles.employment_type is
  'Employment type. Informational only.
   full_time: standard employee
   part_time: works reduced hours/days';
