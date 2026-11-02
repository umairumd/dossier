-- Announcements can be corrected for a short time after posting. The app
-- allows the author to change the title and message for one hour; readers see
-- "Edited" afterwards.

alter table public.notices
  add column if not exists edited_at timestamptz;

comment on column public.notices.edited_at is
  'When the title or message was last changed after posting. Null = never edited.';
