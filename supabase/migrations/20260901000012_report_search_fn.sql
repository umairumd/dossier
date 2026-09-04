-- Report search including field_responses JSONB
-- Migration 012

create or replace function public.search_my_reports(
  search_query text
)
returns setof public.daily_reports
language sql
security definer
stable
as $$
  select * from public.daily_reports
  where author_id = auth.uid()
  and (
    content ilike '%' || search_query || '%'
    or blockers ilike '%' || search_query || '%'
    or additional_notes ilike '%' || search_query || '%'
    or field_responses::text ilike '%' || search_query || '%'
  )
  order by report_date desc, submitted_at desc
  limit 50;
$$;

grant execute on function public.search_my_reports(text) to authenticated;
