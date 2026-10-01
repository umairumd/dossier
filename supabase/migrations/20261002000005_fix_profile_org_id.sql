-- Backfill profiles.organization_id when null.
-- No org_members table: derive from department membership, then sole org.

UPDATE public.profiles AS p
SET organization_id = d.organization_id
FROM public.profile_departments AS pd
JOIN public.departments AS d ON d.id = pd.department_id
WHERE p.organization_id IS NULL
  AND d.organization_id IS NOT NULL;

UPDATE public.profiles
SET organization_id = (
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1
)
WHERE organization_id IS NULL
  AND EXISTS (SELECT 1 FROM public.organizations);
