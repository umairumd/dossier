import { averageSubmissionTime } from "@/lib/helpers/time";
import {
  isWorkingDay,
  todayDateString,
  todayInTimezone,
} from "@/lib/helpers/dates";
import type { AttendanceStatus } from "@/types/attendance";
import type { DailyReport } from "@/types/report";

const COMPLETION_WINDOW_DAYS = 30;

const NEUTRAL_ATTENDANCE: ReadonlySet<AttendanceStatus> = new Set([
  "weekly_off",
  "holiday",
  "leave",
  "half_leave",
]);

const BREAK_ATTENDANCE: ReadonlySet<AttendanceStatus> = new Set([
  "absent",
  "late_major",
]);

export interface ReportStats {
  currentStreak: number;
  reportsThisMonth: number;
  lastSubmittedDate: string | null;
  // Both scoped to a trailing 30-day window — no per-project "expected
  // reporting days" setting exists to define an all-time rate against.
  completionPercentage: number;
  averageSubmissionTime: string | null;
}

export type ReportStatsInput = Pick<DailyReport, "report_date" | "submitted_at">;

export interface ReportStatsOptions {
  workingDays?: number[];
  attendanceByDate?: Map<string, AttendanceStatus>;
}

export function buildAttendanceStatusMap(
  rows: { date: string; status: AttendanceStatus }[],
): Map<string, AttendanceStatus> {
  const map = new Map<string, AttendanceStatus>();
  for (const row of rows) {
    map.set(row.date, row.status);
  }
  return map;
}

export function computeReportStats(
  reports: ReportStatsInput[],
  tz?: string,
  options?: ReportStatsOptions,
): ReportStats {
  const reportDates = new Set(reports.map((report) => report.report_date));
  const todayStr = tz ? todayInTimezone(tz) : todayDateString();
  const workingDays = options?.workingDays;
  const attendanceByDate = options?.attendanceByDate;

  // Current streak: consecutive report days ending on org-local today,
  // skipping neutral attendance / non-working days (transparent).
  let currentStreak = 0;
  let cursor = new Date(`${todayStr}T00:00:00Z`);

  // Safety bound so a missing history never loops forever.
  for (let i = 0; i < 400; i++) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const status = attendanceByDate?.get(dateStr);

    if (status && NEUTRAL_ATTENDANCE.has(status)) {
      cursor = new Date(cursor.getTime() - 86_400_000);
      continue;
    }

    if (
      !status &&
      workingDays &&
      workingDays.length > 0 &&
      !isWorkingDay(dateStr, workingDays)
    ) {
      cursor = new Date(cursor.getTime() - 86_400_000);
      continue;
    }

    if (status && BREAK_ATTENDANCE.has(status)) {
      break;
    }

    if (reportDates.has(dateStr)) {
      currentStreak += 1;
      cursor = new Date(cursor.getTime() - 86_400_000);
      continue;
    }

    break;
  }

  const today = new Date(`${todayStr}T00:00:00Z`);
  const reportsThisMonth = reports.filter((report) => {
    const reportDate = new Date(`${report.report_date}T00:00:00Z`);
    return (
      reportDate.getUTCFullYear() === today.getUTCFullYear() &&
      reportDate.getUTCMonth() === today.getUTCMonth()
    );
  }).length;

  const windowStart = new Date(
    Date.now() - (COMPLETION_WINDOW_DAYS - 1) * 86_400_000,
  );
  const reportsInWindow = reports.filter(
    (report) => new Date(`${report.report_date}T00:00:00Z`) >= windowStart,
  );
  const distinctDatesInWindow = new Set(
    reportsInWindow.map((report) => report.report_date),
  ).size;

  return {
    currentStreak,
    reportsThisMonth,
    lastSubmittedDate: reports[0]?.report_date ?? null,
    completionPercentage: Math.round(
      (distinctDatesInWindow / COMPLETION_WINDOW_DAYS) * 100,
    ),
    averageSubmissionTime: averageSubmissionTime(
      reportsInWindow.map((report) => report.submitted_at),
    ),
  };
}
