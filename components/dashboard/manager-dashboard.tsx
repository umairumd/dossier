import Link from "next/link";
import { Building2 } from "lucide-react";
import { getTodayReport } from "@/lib/supabase/queries/reports";
import { resolveTemplate } from "@/lib/supabase/queries/templates";
import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import { getTeamInsights } from "@/lib/supabase/queries/manager/insights";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import type { ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { formatLongDate } from "@/lib/helpers/dates";
import { formatDeadlineHint } from "@/lib/helpers/time";
import { sortTeamMembersBySubmission } from "@/lib/helpers/team-sort";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { CompletionTrendCard } from "@/components/analytics/completion-trend-card";
import { ReportBanner } from "@/components/shared/report-banner";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { TeamHighlights } from "@/components/manager/team-highlights";

const HOME_ROSTER_PREVIEW = 5;

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
  const today = formatLongDate(new Date());
  const deadline = getDeadlineContext(settings);
  const sortedMembers = sortTeamMembersBySubmission(members);
  const previewMembers = sortedMembers.slice(0, HOME_ROSTER_PREVIEW);
  const remainingCount = sortedMembers.length - previewMembers.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.department_names.join(", ") || "Team"} Dashboard
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{today}</span>
          <Badge variant="outline">
            <Building2 />
            {profile.department_names.join(", ") || "Unassigned"}
          </Badge>
        </div>
      </div>

      <ReportBanner
        todayReport={todayReport}
        deadlineHint={formatDeadlineHint(
          settings.reportDeadlineHourLocal,
          settings.timezone,
        )}
        deadline={deadline}
        template={template}
      />

      <Card
        className="card-gradient animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "0ms" }}
      >
        <CardHeader>
          <CardTitle className="text-base">Your Team Today</CardTitle>
          <CardDescription>{today}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <span>
              <span className="font-semibold">{submittedToday}</span>
              <span className="text-muted-foreground"> submitted</span>
            </span>
            <span>
              <span className="font-semibold text-destructive">
                {missingToday}
              </span>
              <span className="text-muted-foreground"> missing</span>
            </span>
            <span>
              <span className="font-semibold">{completionPercentage}%</span>
              <span className="text-muted-foreground"> completion</span>
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {previewMembers.map((member) => (
              <div
                key={member.employeeId}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 truncate text-sm">
                  {member.fullName}
                </span>
                <div className="shrink-0">
                  <SubmissionStatusBadge
                    status={getSubmissionStatus(
                      member.report?.submitted_at ?? null,
                      deadline.deadlineHourUtc,
                      deadline,
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
          {remainingCount > 0 && (
            <Link
              href="/manager/team-reports"
              className="mt-4 inline-block text-xs text-muted-foreground hover:text-foreground"
            >
              + {remainingCount} more
            </Link>
          )}
          <Link
            href="/manager/team-reports"
            className="mt-4 block text-xs text-muted-foreground hover:text-foreground"
          >
            View full team reports →
          </Link>
        </CardContent>
      </Card>

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
        <CompletionTrendCard
          title="Team Completion Trend"
          description={`Last 7 days · ${insights.weeklyCompletionPercentage}% weekly completion`}
          trend={insights.trend}
          emptyMessage="No reports submitted in the last 7 days."
        />
      </div>

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "150ms" }}
      >
        <TeamHighlights
          longestStreaks={insights.longestStreaks}
          frequentlyMissing={insights.frequentlyMissing}
        />
      </div>

      <Card
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "225ms" }}
      >
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
