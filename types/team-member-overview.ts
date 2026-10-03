import type { UserRole } from "@/types/profile";
import type { DailyReport } from "@/types/report";

export interface TeamMemberOverview {
  id: string;
  full_name: string;
  role: UserRole;
  designation: string | null;
  is_remote: boolean;
  employment_type: "full_time" | "part_time";
  avatar_url: string | null;
  last_seen_at: string | null;
  created_at: string;
  template_id: string | null;
  organization_id: string | null;
  department_ids: string[];
  department_names: string[];
  report_count: number;
  recent_reports: DailyReport[];
  current_streak: number;
  // Both scoped to a trailing 30-day window — no per-project "expected
  // reporting days" setting exists to define an all-time rate against.
  completion_percentage: number;
  average_submission_time: string | null;
}
