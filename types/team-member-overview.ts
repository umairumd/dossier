import type { UserRole } from "@/types/profile";
import type { DailyReport } from "@/types/report";

export interface TeamMemberOverview {
  id: string;
  full_name: string;
  role: UserRole;
  department_names: string[];
  report_count: number;
  recent_reports: DailyReport[];
  current_streak: number;
  // Both scoped to a trailing 30-day window — no per-project "expected
  // reporting days" setting exists to define an all-time rate against.
  completion_percentage: number;
  average_submission_time: string | null;
}
