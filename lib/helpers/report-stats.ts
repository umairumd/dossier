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

const EXEMPT_FROM_EXPECTED: ReadonlySet<AttendanceStatus> = new Set([
  "leave",
  "half_leave",
  "holiday",
]);

export interface ReportStats {
  currentStreak: number;
  reportsThisMonth: number;
  lastSubmittedDate: string | null;
  // Trailing 30 calendar days. Denominator = expected reporting days in
  // the window when workingDays/attendance are provided, else 30.
  completionPercentage: number;
  averageSubmissionTime: string | null;
}

export type ReportStatsInput = Pick<DailyReport, "report_date" | "submitted_at">;

export interface ReportStatsOptions {
  workingDays?: number[];
  attendanceByDate?: Map<string, AttendanceStatus>;
}

export interface TenureSubmissionRate {
  submitted: number;
  expected: number;
  rate: number;
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

export function isAttendanceExempt(
  status: AttendanceStatus | null | undefined,
): boolean {
  return (
    status === "leave" ||
    status === "half_leave" ||
    status === "holiday" ||
    status === "weekly_off"
  );
}

/** Inclusive working-day count between two YYYY-MM-DD dates. */
export function countWorkingDaysBetween(
  startDate: string,
  endDate: string,
  workingDays: number[],
): number {
  if (startDate > endDate || workingDays.length === 0) {
    return 0;
  }

  let count = 0;
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor.getTime() <= end.getTime()) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (isWorkingDay(dateStr, workingDays)) {
      count += 1;
    }
    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  return count;
}

function countExpectedReportingDays(
  start: string,
  end: string,
  workingDays: number[],
  attendanceByDate?: Map<string, AttendanceStatus>,
): number {
  if (workingDays.length === 0) {
    return 0;
  }

  let expected = countWorkingDaysBetween(start, end, workingDays);

  if (attendanceByDate && attendanceByDate.size > 0) {
    let cursor = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);

    while (cursor.getTime() <= endDate.getTime()) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const status = attendanceByDate.get(dateStr);
      if (
        status &&
        EXEMPT_FROM_EXPECTED.has(status) &&
        isWorkingDay(dateStr, workingDays)
      ) {
        expected -= 1;
      }
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  }

  return Math.max(0, expected);
}

/**
 * Submission rate from join date (or first report, if earlier) through
 * org-local today, counting only expected reporting days in the denominator.
 */
export function computeTenureSubmissionRate(
  reports: Pick<DailyReport, "report_date">[],
  joinedOn: string | null,
  workingDays: number[],
  timezone: string,
  attendanceByDate?: Map<string, AttendanceStatus>,
): TenureSubmissionRate {
  const today = todayInTimezone(timezone);
  const joinDate = (joinedOn ?? today).slice(0, 10);
  let earliestReport: string | null = null;
  for (const report of reports) {
    if (!earliestReport || report.report_date < earliestReport) {
      earliestReport = report.report_date;
    }
  }
  const start =
    earliestReport && earliestReport < joinDate ? earliestReport : joinDate;
  const clampedStart = start > today ? today : start;
  const expected = countExpectedReportingDays(
    clampedStart,
    today,
    workingDays,
    attendanceByDate,
  );
  const submitted = new Set(
    reports
      .filter(
        (report) =>
          report.report_date >= clampedStart &&
          report.report_date <= today &&
          isWorkingDay(report.report_date, workingDays),
      )
      .map((report) => report.report_date),
  ).size;

  return {
    submitted,
    expected,
    rate: expected === 0 ? 0 : Math.round((submitted / expected) * 100),
  };
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

    // Today-grace: an unsubmitted working day today does not break the
    // streak — the employee still has time to submit. Off days fall through
    // the weekend/neutral skips above and never reach here.
    if (
      dateStr === todayStr &&
      workingDays &&
      workingDays.length > 0 &&
      isWorkingDay(dateStr, workingDays)
    ) {
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

  const windowStartDate = new Date(`${todayStr}T00:00:00Z`);
  windowStartDate.setUTCDate(
    windowStartDate.getUTCDate() - (COMPLETION_WINDOW_DAYS - 1),
  );
  const windowStartStr = windowStartDate.toISOString().slice(0, 10);

  const reportsInWindow = reports.filter(
    (report) => report.report_date >= windowStartStr,
  );
  const distinctDatesInWindow = new Set(
    reportsInWindow.map((report) => report.report_date),
  ).size;

  const expected =
    workingDays && workingDays.length > 0
      ? countExpectedReportingDays(
          windowStartStr,
          todayStr,
          workingDays,
          attendanceByDate,
        )
      : COMPLETION_WINDOW_DAYS;

  return {
    currentStreak,
    reportsThisMonth,
    lastSubmittedDate: reports[0]?.report_date ?? null,
    completionPercentage:
      expected === 0
        ? 0
        : Math.round((distinctDatesInWindow / expected) * 100),
    averageSubmissionTime: averageSubmissionTime(
      reportsInWindow.map((report) => report.submitted_at),
    ),
  };
}
