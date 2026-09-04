export interface DailyReport {
  id: string;
  author_id: string;
  report_date: string;
  content: string;
  blockers: string | null;
  additional_notes: string | null;
  submitted_at: string;
  created_at: string;
  template_id: string | null;
  field_responses: Record<string, unknown> | null;
}
