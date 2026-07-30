import type { DailyReport } from "@/types/report";

export interface TeamMemberReport {
  employeeId: string;
  fullName: string;
  report: DailyReport | null;
}
