import type { UserRole } from "@/types/profile";
import type { DailyReport } from "@/types/report";
import type { ReportStats } from "@/lib/helpers/report-stats";

// Archived: soft-removed from the active org (excluded from active
// rosters), reports kept. Invited: account created with a temporary
// password, has_onboarded is still false. Active: has_onboarded is true.
// Disabled: is_active=false (banned via the Admin API) but not archived.
// Archived takes priority over all other signals — an archived employee
// is never shown as anything else.
export type EmployeeStatus =
  | "archived"
  | "invited"
  | "active"
  | "disabled";

export interface EmployeeListItem {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  department_ids: string[];
  department_names: string[];
  organization_id: string | null;
  supervisor_ids: string[];
  is_active: boolean;
  archived_at: string | null;
  invited_at: string | null;
  last_sign_in_at: string | null;
  status: EmployeeStatus;
  designation: string | null;
  is_remote: boolean;
  employment_type: "full_time" | "part_time";
  avatar_url: string | null;
  template_id: string | null;
  created_at: string;
}

export interface EmployeeDetail extends EmployeeListItem {
  report_count: number;
  recent_reports: DailyReport[];
  stats: ReportStats;
}
