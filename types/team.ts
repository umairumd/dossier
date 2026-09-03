import type { DailyReport } from "@/types/report";

export interface TeamMemberReport {
  employeeId: string;
  fullName: string;
  designation: string | null;
  report: DailyReport | null;
}
