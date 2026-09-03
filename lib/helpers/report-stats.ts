import { averageSubmissionTime } from "@/lib/helpers/time";
import { todayDateString, todayInTimezone } from "@/lib/helpers/dates";
import type { DailyReport } from "@/types/report";

const COMPLETION_WINDOW_DAYS = 30;

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

export function computeReportStats(
  reports: ReportStatsInput[],
  tz?: string,
): ReportStats {
  const reportDates = new Set(reports.map((report) => report.report_date));
  const todayStr = tz ? todayInTimezone(tz) : todayDateString();

  // Current streak: consecutive days ending on org-local today.
  let currentStreak = 0;
  let cursor = new Date(`${todayStr}T00:00:00Z`);
  while (reportDates.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
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
