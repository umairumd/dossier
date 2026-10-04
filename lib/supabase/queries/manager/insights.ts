import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  computeReportStats,
  computeTenureSubmissionRate,
  type ReportStatsInput,
} from "@/lib/helpers/report-stats";
import { dateNDaysAgo } from "@/lib/helpers/dates";
import {
  buildCompletionTrend,
  buildSubmittersByDate,
} from "@/lib/helpers/completion-trend";
import { getTeamReportingRoster } from "@/lib/supabase/queries/manager/team";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getTeamActivityLog } from "@/lib/supabase/queries/admin/activity";
import type { AttendanceStatus } from "@/types/attendance";
import type { TeamInsights, TeamMemberStanding } from "@/types/team-insights";

const TREND_DAYS = 7;
const LEADERBOARD_SIZE = 3;
const RECENT_ACTIVITY_SIZE = 20;
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
  const settings = await getOrganizationSettings();
  const roster = await getTeamReportingRoster();

  if (roster.length === 0) {
    return {
      trend: [],
      weeklyCompletionPercentage: 0,
      longestStreaks: [],
      frequentlyMissing: [],
      recentActivity: [],
      memberStandings: [],
    };
  }

  const earliestJoin = roster.reduce((min, member) => {
    const joinDate = member.created_at.slice(0, 10);
    return !min || joinDate < min ? joinDate : min;
  }, "");
  // Tenure submission needs reports back to join; streak still uses the
  // attendance window below. Use the earlier of join vs insights window.
  const reportsSince = (() => {
    const windowStart = dateNDaysAgo(INSIGHTS_WINDOW_DAYS - 1);
    return earliestJoin && earliestJoin < windowStart
      ? earliestJoin
      : windowStart;
  })();

  const [
    { data: reports, error },
    { data: attendanceRows },
    recentActivity,
  ] = await Promise.all([
    supabase
      .from("daily_reports")
      .select("id, author_id, report_date, submitted_at")
      .gte("report_date", reportsSince),
    supabase
      .from("attendance_records")
      .select("profile_id, date, status")
      .in(
        "profile_id",
        roster.map((member) => member.id),
      )
      .gte("date", dateNDaysAgo(INSIGHTS_WINDOW_DAYS - 1)),
    getTeamActivityLog(RECENT_ACTIVITY_SIZE),
  ]);

  if (error) {
    throw new Error("Failed to load team report history.");
  }

  const allReports =
    (reports as (ReportStatsInput & { id: string; author_id: string })[]) ?? [];

  const submittersByDate = buildSubmittersByDate(allReports);

  // Grouped by author for the streak/completion computation below — a
  // different shape than submittersByDate (which only needs to know
  // "who submitted," not "with what content"), so kept as its own pass.
  const reportsByAuthor = new Map<string, ReportStatsInput[]>();
  for (const report of allReports) {
    const authorReports = reportsByAuthor.get(report.author_id) ?? [];
    authorReports.push(report);
    reportsByAuthor.set(report.author_id, authorReports);
  }

  const attendanceByAuthor = new Map<string, Map<string, AttendanceStatus>>();
  for (const row of (attendanceRows as {
    profile_id: string;
    date: string;
    status: AttendanceStatus;
  }[]) ?? []) {
    const map = attendanceByAuthor.get(row.profile_id) ?? new Map();
    map.set(row.date, row.status);
    attendanceByAuthor.set(row.profile_id, map);
  }

  const trend = buildCompletionTrend(
    TREND_DAYS,
    submittersByDate,
    roster.length,
    settings.workingDays,
    settings.timezone,
  );

  const weeklyCompletionPercentage =
    trend.length === 0
      ? 0
      : Math.round(
          trend.reduce((sum, point) => sum + point.completionPercentage, 0) /
            trend.length,
        );

  const standings: TeamMemberStanding[] = roster.map((member) => {
    const memberReports = [...(reportsByAuthor.get(member.id) ?? [])].sort(
      (a, b) => b.report_date.localeCompare(a.report_date),
    );
    const stats = computeReportStats(memberReports, settings.timezone, {
      workingDays: settings.workingDays,
      attendanceByDate: attendanceByAuthor.get(member.id),
    });
    const tenure = computeTenureSubmissionRate(
      memberReports,
      member.created_at,
      settings.workingDays,
      settings.timezone,
      attendanceByAuthor.get(member.id),
    );
    return {
      employeeId: member.id,
      fullName: member.full_name,
      streak: stats.currentStreak,
      completionPercentage: stats.completionPercentage,
      reportsThisMonth: stats.reportsThisMonth,
      reportsSubmitted: tenure.submitted,
      expectedWorkingDays: tenure.expected,
      submissionRate: tenure.rate,
      lastSubmittedDate: stats.lastSubmittedDate,
    };
  });

  const longestStreaks = [...standings]
    .sort((a, b) => b.streak - a.streak)
    .slice(0, LEADERBOARD_SIZE);

  const frequentlyMissing = [...standings]
    .sort((a, b) => a.completionPercentage - b.completionPercentage)
    .slice(0, LEADERBOARD_SIZE);

  return {
    trend,
    weeklyCompletionPercentage,
    longestStreaks,
    frequentlyMissing,
    recentActivity,
    memberStandings: standings,
  };
});
