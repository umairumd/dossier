import { getReportHistory, getReportStatsData, getTodayReport } from "@/lib/supabase/queries/reports";
import { getOrgTemplatesWithFields, resolveTemplate } from "@/lib/supabase/queries/templates";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getMyActivityLog } from "@/lib/supabase/queries/admin/activity";
import type { ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { dateNDaysAgo } from "@/lib/helpers/dates";
import { formatDeadlineHint } from "@/lib/helpers/time";
import {
  buildAttendanceStatusMap,
  computeReportStats,
} from "@/lib/helpers/report-stats";
import type { AttendanceStatus } from "@/types/attendance";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityStrip } from "@/components/dashboard/activity-strip";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { ReportBanner } from "@/components/shared/report-banner";
import { RecentReportsCard } from "@/components/reports/recent-reports-card";

const RECENT_PREVIEW_SIZE = 5;
const MY_ACTIVITY_LIMIT = 8;

export async function EmployeeDashboard({
  profile,
}: {
  profile: ProfileWithDepartment;
}) {
  const supabase = await createClient();
  const [todayReport, preview, statsRows, settings, template, templates, attendanceResult, myActivity] =
    await Promise.all([
      getTodayReport(),
      getReportHistory(1, RECENT_PREVIEW_SIZE),
      getReportStatsData(),
      getOrganizationSettings(),
      resolveTemplate(profile.id, profile.department_ids),
      getOrgTemplatesWithFields(),
      supabase
        .from("attendance_records")
        .select("date, status")
        .eq("profile_id", profile.id)
        .gte("date", dateNDaysAgo(399)),
      getMyActivityLog(MY_ACTIVITY_LIMIT),
    ]);

  const stats = computeReportStats(statsRows, settings.timezone, {
    workingDays: settings.workingDays,
    attendanceByDate: buildAttendanceStatusMap(
      (attendanceResult.data as { date: string; status: AttendanceStatus }[]) ??
        [],
    ),
  });
  const deadline = getDeadlineContext(settings);
  const submittedToday = !!todayReport;
  const streak = stats.currentStreak;

  let contextLine: string;
  if (!submittedToday && streak > 0) {
    contextLine = `🔥 ${streak}-day streak — submit today's report to keep it going`;
  } else if (!submittedToday && streak === 0) {
    contextLine = "Submit today's report to start your streak";
  } else if (submittedToday && streak > 2) {
    contextLine = `🔥 ${streak}-day streak and counting — great work`;
  } else if (submittedToday && streak === 2) {
    contextLine = "2 days in a row — you're building a streak";
  } else {
    contextLine = "You're all caught up for today";
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        userId={profile.id}
        name={profile.full_name}
        designation={profile.designation}
        departmentNames={profile.department_names}
        contextLine={contextLine}
        stats={[
          { label: "Current Streak", value: `${stats.currentStreak} days` },
          { label: "This Month", value: `${stats.reportsThisMonth} reports` },
          { label: "30-Day Rate", value: `${stats.completionPercentage}%` },
        ]}
      />

      <ReportBanner
        todayReport={todayReport}
        deadlineHint={formatDeadlineHint(
          settings.reportDeadlineHourLocal,
          settings.timezone,
        )}
        deadline={deadline}
        template={template ?? undefined}
      />

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "0ms" }}
      >
        <ActivityStrip
          reports={statsRows}
          timezone={settings.timezone}
          workingDays={settings.workingDays}
        />
      </div>

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
        <RecentReportsCard
          reports={preview.reports}
          viewAllHref="/reports"
          deadline={deadline}
          userName={profile.full_name}
          templates={templates}
        />
      </div>

      <Card
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "150ms" }}
      >
        <CardHeader>
          <CardTitle>Your Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            variant="dashboard"
            items={myActivity}
            emptyMessage="No activity yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
