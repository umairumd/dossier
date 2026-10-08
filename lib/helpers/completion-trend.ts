import {
  dateNDaysAgo,
  isWorkingDay,
  shiftReportDate,
  todayInTimezone,
} from "@/lib/helpers/dates";
import type { CompletionTrendPoint } from "@/types/team-insights";

export function buildSubmittersByDate(
  reports: { author_id: string; report_date: string }[],
): Map<string, Set<string>> {
  const submittersByDate = new Map<string, Set<string>>();

  for (const report of reports) {
    const submitters = submittersByDate.get(report.report_date) ?? new Set();
    submitters.add(report.author_id);
    submittersByDate.set(report.report_date, submitters);
  }

  return submittersByDate;
}

export function buildCompletionTrend(
  days: number,
  submittersByDate: Map<string, Set<string>>,
  denominator: number,
  workingDays?: number[],
  tz?: string,
  holidayDates?: Set<string>,
): CompletionTrendPoint[] {
  const points: CompletionTrendPoint[] = [];
  const today = tz ? todayInTimezone(tz) : dateNDaysAgo(0);

  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = shiftReportDate(today, -daysAgo);

    if (workingDays && !isWorkingDay(date, workingDays)) {
      continue;
    }

    if (holidayDates?.has(date)) continue;

    const submitterCount = submittersByDate.get(date)?.size ?? 0;
    points.push({
      date,
      submitted: submitterCount,
      expected: denominator,
      completionPercentage:
        denominator === 0
          ? 0
          : Math.min(100, Math.round((submitterCount / denominator) * 100)),
    });
  }

  return points;
}

/** Current window, with today omitted until the deadline has passed. Comparison only when half the previous working days have a report. */
export function completionWindows(
  series: CompletionTrendPoint[],
  today: string,
  includeToday: boolean,
): { trend: CompletionTrendPoint[]; previousAverage: number | null } {
  const cutoff = shiftReportDate(today, -29);
  const trend = series.filter(
    (point) => point.date >= cutoff && (includeToday || point.date !== today),
  );
  const previous = series.filter((point) => point.date < cutoff);
  const withReports = previous.filter((point) => (point.submitted ?? 0) > 0).length;
  const previousAverage =
    previous.length > 0 && withReports * 2 >= previous.length
      ? Math.round(
          previous.reduce((sum, point) => sum + point.completionPercentage, 0) / previous.length,
        )
      : null;
  return { trend, previousAverage };
}
