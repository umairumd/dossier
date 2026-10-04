import Link from "next/link";
import { getTodayReport } from "@/lib/supabase/queries/reports";
import { resolveTemplate } from "@/lib/supabase/queries/templates";
import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import { getTeamInsights } from "@/lib/supabase/queries/manager/insights";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getMyTodayAttendanceStatus } from "@/lib/supabase/queries/attendance";
import type { ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { formatDeadlineHint } from "@/lib/helpers/time";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { HeroReportStatus } from "@/components/dashboard/hero-report-status";
import { TeamTodayPanel } from "@/components/dashboard/team-today-panel";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { CompletionTrendCard } from "@/components/analytics/completion-trend-card";
import { TeamHighlights } from "@/components/manager/team-highlights";

export async function ManagerDashboard({
  profile,
}: {
  profile: ProfileWithDepartment;
}) {
  const [todayReport, members, insights, settings, template] = await Promise.all([
    getTodayReport(),
    getTeamReportsForDate(),
    getTeamInsights(),
    getOrganizationSettings(),
    resolveTemplate(profile.id, profile.department_ids),
  ]);
  const teamSize = members.length;
  const submittedToday = members.filter((member) => member.report).length;
  const missingToday = teamSize - submittedToday;
  const completionPercentage =
    teamSize === 0 ? 0 : Math.round((submittedToday / teamSize) * 100);
  const todayDate = todayInTimezone(settings.timezone);
  const deadline = getDeadlineContext(settings);

  // Off-day awareness: weekends/non-working days from org config, plus
  // holidays recorded in attendance_records.
  const todayAttendanceStatus = await getMyTodayAttendanceStatus(todayDate);
  const isHoliday = todayAttendanceStatus === "holiday";
  const isOffDay = !isWorkingDay(todayDate, settings.workingDays) || isHoliday;
  // TODO: remove — temporary override so we can preview working-day hero
  // report-status rows on a Sunday.
  const debugIsOffDay = true;

  // Context line is team status only — report/off-day actions live in
  // HeroReportStatus below the divider.
  let contextLine: string;
  if (teamSize === 0) {
    contextLine = "No team members assigned yet";
  } else if (missingToday === 0) {
    contextLine = `✓ Your entire team has submitted today`;
  } else {
    contextLine = `${submittedToday} of ${teamSize} team members have submitted today`;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        userId={profile.id}
        name={profile.full_name}
        designation={profile.designation}
        departmentNames={profile.department_names}
        contextLine={contextLine}
        stats={
          isOffDay
            ? [
                { label: "Team Size", value: String(teamSize) },
                { label: "Submitted", value: String(submittedToday) },
              ]
            : [
                { label: "Team Size", value: String(teamSize) },
                { label: "Submitted", value: String(submittedToday) },
                { label: "Missing", value: String(missingToday) },
                { label: "Completion", value: `${completionPercentage}%` },
              ]
        }
        reportStatus={
          <HeroReportStatus
            todayReport={todayReport}
            isOffDay={debugIsOffDay}
            deadlineHint={formatDeadlineHint(
              settings.reportDeadlineHourLocal,
              settings.timezone,
            )}
            template={template ?? undefined}
          />
        }
      />

      <Card
        className="card-gradient animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "0ms" }}
      >
        <CardContent>
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 md:min-h-[280px]">
            <TeamTodayPanel
              initialMembers={members}
              initialDate={todayDate}
              timezone={settings.timezone}
              workingDays={settings.workingDays}
              deadline={deadline}
              initialIsOffDay={isOffDay}
            />
            {/* Explicit min-height on small screens — embedded chart uses
                h-full, which collapses when the grid row has no md:min-h. */}
            <div className="min-h-[200px] md:h-full md:min-h-0">
              <CompletionTrendCard
                embedded
                dimmed={isOffDay}
                title="Team Completion Trend"
                description={`Last 7 days · ${Math.min(100, insights.weeklyCompletionPercentage)}% weekly completion`}
                trend={insights.trend}
                emptyMessage="No reports submitted in the last 7 days."
                footnote="* includes voluntary submissions."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
        <TeamHighlights
          longestStreaks={insights.longestStreaks}
          frequentlyMissing={insights.frequentlyMissing}
        />
      </div>

      <Card
        className="card-gradient animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "150ms" }}
      >
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardAction>
            <Link
              href="/activity"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              View all
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            items={insights.recentActivity}
            emptyMessage="No recent activity."
          />
        </CardContent>
      </Card>
    </div>
  );
}
