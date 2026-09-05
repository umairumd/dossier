-- Remove pending_invite_link column (no longer needed)
-- Temp password flow doesn't store links in DB

alter table public.profiles
  drop column if exists pending_invite_link;
