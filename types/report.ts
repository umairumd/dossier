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

import type { AccessoryId } from "@/lib/mascot";

export interface SubmitReportResult {
  success: boolean;
  error?: string;
  /** Set by submitDailyReport. True when the submit landed before the org deadline. */
  onTime?: boolean;
  /** Newly unlocked accessories. Empty until reward sync lands in phase 5. */
  unlocked?: AccessoryId[];
}

export type ReportComment = {
  id: string;
  body: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    avatar: unknown | null;
  } | null;
};
