-- Allow authors to update their own daily reports (same-day edit is
-- enforced in the application layer via updateDailyReport).

CREATE POLICY daily_reports_update_own
  ON public.daily_reports FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
