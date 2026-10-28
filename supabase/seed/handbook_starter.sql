-- Starter handbook: three drafts so the handbook isn't empty on day one.
-- Not a migration. Run once per organization, after 20261028000010:
--
--   Paste into the Supabase SQL editor. Uses the first organization; replace the subquery with an id if there is more than one.
--
-- Safe to re-run: existing slugs are left alone. The docs are drafts
-- (version 0); an owner or admin reviews and publishes them from
-- Organization > Handbook.

begin;

insert into public.handbook_docs
  (organization_id, kind, title, slug, summary, draft_md, requires_ack, start_here)
values
(
  (select id from public.organizations order by created_at limit 1), 'guide', 'Your first week', 'your-first-week',
  'What to expect, who to meet and what to set up in your first five days.',
$md$
## Before day one

- Sign in to Dossier with the link in your invitation email and set your password.
- Add a photo or dress up your buddy under Settings.

## Day one

- Meet your manager. They'll walk you through your work and priorities.
- Check **Who to ask** in the handbook: it lists your manager, your supervisor and the people who can help with anything else.
- Read the documents under **Start here** and tick them off.

## Every day

Write your daily report in Dossier before the deadline. Your supervisor reads it and may leave a comment.

## By the end of the week

- You know where your team keeps its work.
- You've read the leave policy and know how to request leave.
- You've had a check-in with your manager.
$md$,
  false, true
),
(
  (select id from public.organizations order by created_at limit 1), 'guide', 'How to request leave', 'how-to-request-leave',
  'Requesting planned and sick leave in Dossier.',
$md$
## Steps

1. Request leave in Dossier
   Go to Attendance and request the days. For planned leave, do this at least 3 working days ahead.
2. Sick leave on the day
   If you're unwell, request sick leave the same day, as early as you can, and tell your manager.
3. HR confirms
   HR reviews the request and approves or declines it. You get a notification either way.
4. Your balance updates automatically
   Approved days come off your leave balance. You can see what's left on your Home page.

## Questions

Ask HR, or anyone listed under **Who to ask** in the handbook.
$md$,
  false, false
),
(
  (select id from public.organizations order by created_at limit 1), 'policy', 'Leave policy', 'leave-policy',
  'How much paid leave you get, when it renews and what happens to unused days.',
$md$
## How much leave you get

You earn **2 days of paid leave per month**, up to **24 days per contract year**.

## Your contract year

Your contract year starts in the month your contract started, not in January. Your balance renews at the start of each contract year.

## Unused days

Unused days are **paid out at the end of your contract year**. They don't carry over.

## Requesting leave

Request leave in Dossier at least 3 working days ahead. Sick leave can be requested on the same day. See *How to request leave* for the steps.
$md$,
  true, true
)
on conflict (organization_id, slug) do nothing;

insert into public.handbook_doc_audiences (doc_id, kind, value)
select d.id, 'everyone', null
from public.handbook_docs d
where d.organization_id = (select id from public.organizations order by created_at limit 1)
  and d.slug in ('your-first-week', 'how-to-request-leave', 'leave-policy')
  and not exists (
    select 1 from public.handbook_doc_audiences a
    where a.doc_id = d.id
  );

commit;
