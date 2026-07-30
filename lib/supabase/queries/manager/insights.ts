import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { computeReportStats, type ReportStatsInput } from "@/lib/helpers/report-stats";
import { dateNDaysAgo } from "@/lib/helpers/dates";
import { getTeamEmployeeRoster } from "@/lib/supabase/queries/manager/team";
import type { ActivityItem } from "@/types/activity";
import type {
  CompletionTrendPoint,
  TeamInsights,
  TeamMemberStanding,
} from "@/types/team-insights";

const TREND_DAYS = 7;
const LEADERBOARD_SIZE = 3;
const RECENT_ACTIVITY_SIZE = 8;
// Streak/completion here are bounded to this window deliberately — an
// employee with a streak longer than 90 days would show as capped at 90,
// which is an acceptable trade-off for "one query for the whole team"
// instead of unbounded history per person.
const INSIGHTS_WINDOW_DAYS = 90;

// One query for the whole team's report history (bounded to 90 days),
// reused to compute the 7-day trend AND every member's streak/completion
// — not one query per team member. RLS
// (daily_reports_select_department_as_manager) scopes it to this
// manager's own department, same as every other manager query.
export const getTeamInsights = cache(async (): Promise<TeamInsights> => {
  const supabase = await createClient();
  const roster = await getTeamEmployeeRoster();

  if (roster.length === 0) {
    return {
      trend: [],
      weeklyCompletionPercentage: 0,
      longestStreaks: [],
      frequentlyMissing: [],
      recentActivity: [],
    };
  }

  const { data: reports, error } = await supabase
    .from("daily_reports")
    .select("id, author_id, report_date, submitted_at")
    .gte("report_date", dateNDaysAgo(INSIGHTS_WINDOW_DAYS - 1));

  if (error) {
    throw new Error("Failed to load team report history.");
  }

  const nameById = new Map(roster.map((member) => [member.id, member.full_name]));

  const allReports =
    (reports as (ReportStatsInput & { id: string; author_id: string })[]) ?? [];

  const submittersByDate = new Map<string, Set<string>>();
  const reportsByAuthor = new Map<string, ReportStatsInput[]>();

  for (const report of allReports) {
    const submitters = submittersByDate.get(report.report_date) ?? new Set();
    submitters.add(report.author_id);
    submittersByDate.set(report.report_date, submitters);

    const authorReports = reportsByAuthor.get(report.author_id) ?? [];
    authorReports.push(report);
    reportsByAuthor.set(report.author_id, authorReports);
  }

  const trend: CompletionTrendPoint[] = [];
  for (let daysAgo = TREND_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = dateNDaysAgo(daysAgo);
    const submitterCount = submittersByDate.get(date)?.size ?? 0;
    trend.push({
      date,
      completionPercentage: Math.round((submitterCount / roster.length) * 100),
    });
  }

  const weeklyCompletionPercentage = Math.round(
    trend.reduce((sum, point) => sum + point.completionPercentage, 0) /
      trend.length,
  );

  const standings: TeamMemberStanding[] = roster.map((member) => {
    const stats = computeReportStats(reportsByAuthor.get(member.id) ?? []);
    return {
      employeeId: member.id,
      fullName: member.full_name,
      streak: stats.currentStreak,
      completionPercentage: stats.completionPercentage,
    };
  });

  const longestStreaks = [...standings]
    .sort((a, b) => b.streak - a.streak)
    .slice(0, LEADERBOARD_SIZE);

  const frequentlyMissing = [...standings]
    .sort((a, b) => a.completionPercentage - b.completionPercentage)
    .slice(0, LEADERBOARD_SIZE);

  // Derived from the same 90-day fetch — "recent activity" here means
  // recent report submissions specifically; there's no persisted audit
  // log for other event types at the team level (see ActivityFeed).
  const recentActivity: ActivityItem[] = [...allReports]
    .sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
    )
    .slice(0, RECENT_ACTIVITY_SIZE)
    .map((report) => ({
      id: report.id,
      type: "report_submitted",
      label: `${nameById.get(report.author_id) ?? "Someone"} submitted a report`,
      timestamp: report.submitted_at,
      href: `/manager/employees/${report.author_id}`,
    }));

  return {
    trend,
    weeklyCompletionPercentage,
    longestStreaks,
    frequentlyMissing,
    recentActivity,
  };
});
