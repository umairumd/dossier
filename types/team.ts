import type { AttendanceStatus } from "@/types/attendance";
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
  /** Attendance status for the report date when leave/holiday/weekly_off. */
  attendanceStatus?: AttendanceStatus | null;
  report: DailyReport | null;
}
