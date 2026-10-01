import type { DailyReport } from "@/types/report";

export interface TeamMemberReport {
  employeeId: string;
  fullName: string;
  designation: string | null;
  avatarUrl?: string | null;
  isRemote?: boolean;
  employment_type?: "full_time" | "part_time";
  /** True when attendance has an approved leave/half_leave for the report date. */
  isOnLeave?: boolean;
  report: DailyReport | null;
}
