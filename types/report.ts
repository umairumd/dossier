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

export interface SubmitReportResult {
  success: boolean;
  error?: string;
}

export type ReportComment = {
  id: string;
  body: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};
