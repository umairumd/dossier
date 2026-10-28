-- Who awarded an item and why. Rows with source = 'grant' come from
-- "Award an item" on an employee profile; taking an award back deletes the row.
-- Run after 20261029000002.

alter table public.avatar_unlocks
  add column if not exists granted_by uuid references public.profiles (id) on delete set null,
  add column if not exists reason text
    constraint avatar_unlocks_reason_length check (reason is null or char_length(reason) <= 300);

comment on column public.avatar_unlocks.granted_by is
  'Owner or admin who awarded the item (source = grant).';
comment on column public.avatar_unlocks.reason is
  'Why it was awarded, shown to the person in the notification and wardrobe.';
