import { Building2 } from "lucide-react";
import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import { getTeamInsights } from "@/lib/supabase/queries/manager/insights";
import type { ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import { formatLongDate } from "@/lib/helpers/dates";
import { averageSubmissionTime } from "@/lib/helpers/time";
import { isLateSubmission } from "@/lib/helpers/report-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { CompletionTrendCard } from "@/components/analytics/completion-trend-card";
import { ManagerSummaryCards } from "@/components/manager/manager-summary-cards";
import { QuickActions } from "@/components/manager/quick-actions";
import { TeamHighlights } from "@/components/manager/team-highlights";
import { TeamReportList } from "@/components/manager/team-report-list";

function hasReport(
  member: TeamMemberReport,
): member is TeamMemberReport & { report: DailyReport } {
  return member.report !== null;
}

export async function ManagerDashboard({
  profile,
}: {
  profile: ProfileWithDepartment;
}) {
  const [members, insights] = await Promise.all([
    getTeamReportsForDate(),
    getTeamInsights(),
  ]);
  const teamSize = members.length;
  const submittedMembers = members.filter(hasReport);
  const submittedToday = submittedMembers.length;
  const missingToday = teamSize - submittedToday;
  const completionPercentage =
    teamSize === 0 ? 0 : Math.round((submittedToday / teamSize) * 100);
  const lateSubmissions = submittedMembers.filter((member) =>
    isLateSubmission(member.report.submitted_at),
  ).length;
  const today = formatLongDate(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.department?.name ?? "Team"} Dashboard
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{today}</span>
          <Badge variant="outline">
            <Building2 />
            {profile.department?.name ?? "Unassigned"}
          </Badge>
        </div>
      </div>

      <ManagerSummaryCards
        teamSize={teamSize}
        submittedToday={submittedToday}
        missingToday={missingToday}
        completionPercentage={completionPercentage}
        averageSubmissionTime={averageSubmissionTime(
          submittedMembers.map((member) => member.report.submitted_at),
        )}
        lateSubmissions={lateSubmissions}
      />

      <QuickActions />

      <CompletionTrendCard
        title="Team Completion Trend"
        description={`Last 7 days · ${insights.weeklyCompletionPercentage}% weekly completion`}
        trend={insights.trend}
        emptyMessage="No reports submitted in the last 7 days."
      />

      <TeamHighlights
        longestStreaks={insights.longestStreaks}
        frequentlyMissing={insights.frequentlyMissing}
      />

      <TeamReportList members={members} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            items={insights.recentActivity}
            emptyMessage="No reports submitted recently."
          />
        </CardContent>
      </Card>
    </div>
  );
}
