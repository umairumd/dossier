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
): CompletionTrendPoint[] {
  const points: CompletionTrendPoint[] = [];
  const today = tz ? todayInTimezone(tz) : dateNDaysAgo(0);

  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = shiftReportDate(today, -daysAgo);

    if (workingDays && !isWorkingDay(date, workingDays)) {
      continue;
    }

    const submitterCount = submittersByDate.get(date)?.size ?? 0;
    points.push({
      date,
      completionPercentage:
        denominator === 0
          ? 0
          : Math.round((submitterCount / denominator) * 100),
    });
  }

  return points;
}
