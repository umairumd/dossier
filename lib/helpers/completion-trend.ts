import { dateNDaysAgo } from "@/lib/helpers/dates";
import type { CompletionTrendPoint } from "@/types/team-insights";

// Was independently reimplemented in both the manager (getTeamInsights)
// and admin (getOrganizationTrends) trend queries — same map-building
// loop, same N-days-back loop, different denominators. Extracted so
// there's one definition of "how a completion trend is built" instead of
// two that could quietly drift apart.
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
): CompletionTrendPoint[] {
  const points: CompletionTrendPoint[] = [];

  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = dateNDaysAgo(daysAgo);
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
