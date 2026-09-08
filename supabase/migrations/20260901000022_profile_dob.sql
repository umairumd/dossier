-- Add optional date of birth to profiles.
-- Used for birthday wishes and employee records.
-- Set by employees themselves during onboarding or profile settings.
alter table public.profiles
  add column date_of_birth date;

comment on column public.profiles.date_of_birth is
  'Optional. Set by the employee during onboarding or profile settings.';
