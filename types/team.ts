import type { AttendanceStatus } from "@/types/attendance";
import type { DailyReport } from "@/types/report";

export interface TeamMemberReport {
  employeeId: string;
  fullName: string;
  designation: string | null;
  avatarUrl?: string | null;
  /** Raw profiles.avatar. Null renders defaultAvatar(employeeId). */
  avatar?: unknown;
  /** profiles.date_of_birth. Used to wear the party hat on the org-timezone birthday. */
  dateOfBirth?: string | null;
  isRemote?: boolean;
  employment_type?: "full_time" | "part_time";
  /** True when attendance has an approved leave/half_leave for the report date. */
  isOnLeave?: boolean;
  /** Attendance status for the report date when leave/holiday/weekly_off. */
  attendanceStatus?: AttendanceStatus | null;
  report: DailyReport | null;
  /** Last consecutive full-day leave date starting today, when they are on leave today. */
  leaveUntil?: string | null;
}
