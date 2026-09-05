import type { DailyReport } from "@/types/report";

export interface TeamMemberReport {
  employeeId: string;
  fullName: string;
  designation: string | null;
  avatarUrl?: string | null;
  isRemote?: boolean;
  employment_type?: "full_time" | "part_time";
  report: DailyReport | null;
}
