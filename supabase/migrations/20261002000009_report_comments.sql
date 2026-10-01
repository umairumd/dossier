CREATE TABLE IF NOT EXISTS public.report_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;

-- Managers, admins, owners can read comments on reports in their org
CREATE POLICY report_comments_manager_read
  ON public.report_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'admin', 'owner')
        AND p.organization_id = (
          SELECT pr.organization_id FROM public.profiles pr
          JOIN public.daily_reports dr ON dr.author_id = pr.id
          WHERE dr.id = report_id
        )
    )
  );

-- Report author can also read comments on their own report
CREATE POLICY report_comments_author_read
  ON public.report_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_reports dr
      WHERE dr.id = report_id AND dr.author_id = auth.uid()
    )
  );

-- Managers, admins, owners can insert
CREATE POLICY report_comments_manager_insert
  ON public.report_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'admin', 'owner')
    )
  );
