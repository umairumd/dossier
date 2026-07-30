import { averageSubmissionTime } from "@/lib/helpers/time";
import { todayDateString } from "@/lib/helpers/dates";
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

// Only report_date/submitted_at are actually read — typed as a Pick, not
// the full DailyReport, so callers that only need those two columns
// (e.g. getTeamInsights, computing this across an entire team) don't have
// to over-select content/blockers/additional_notes just to satisfy this
// function's type.
export type ReportStatsInput = Pick<DailyReport, "report_date" | "submitted_at">;

// Shared by the employee's own dashboard, the manager's per-employee
// overview, and team-wide insights — all need the exact same
// streak/completion/average-time math applied to "one person's report
// list," just for different viewers. `reports` should already be sorted
// newest-first (every caller already fetches it that way for its own
// display purposes) since lastSubmittedDate reads reports[0].
export function computeReportStats(reports: ReportStatsInput[]): ReportStats {
  const reportDates = new Set(reports.map((report) => report.report_date));

  // Current streak: consecutive days ending today with a submission.
  // Breaks immediately (streak = 0) if today itself has no report —
  // matching how most "streak" UIs treat a missed day, rather than
  // reporting a stale streak from before the gap.
  let currentStreak = 0;
  let cursor = new Date(`${todayDateString()}T00:00:00Z`);
  while (reportDates.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  const today = new Date(`${todayDateString()}T00:00:00Z`);
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
