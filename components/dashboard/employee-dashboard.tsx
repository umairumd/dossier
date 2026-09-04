import { Building2, Flame } from "lucide-react";
import { getReportHistory, getReportStatsData, getTodayReport } from "@/lib/supabase/queries/reports";
import { getOrgTemplatesWithFields, resolveTemplate } from "@/lib/supabase/queries/templates";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import type { ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { formatLongDate } from "@/lib/helpers/dates";
import { formatDeadlineHint } from "@/lib/helpers/time";
import { computeReportStats } from "@/lib/helpers/report-stats";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/analytics/stat-card";
import { ActivityStrip } from "@/components/dashboard/activity-strip";
import { ReportBanner } from "@/components/shared/report-banner";
import { RecentReportsCard } from "@/components/reports/recent-reports-card";

const RECENT_PREVIEW_SIZE = 5;

export async function EmployeeDashboard({
  profile,
}: {
  profile: ProfileWithDepartment;
}) {
  const [todayReport, preview, statsRows, settings, template, templates] =
    await Promise.all([
      getTodayReport(),
      getReportHistory(1, RECENT_PREVIEW_SIZE),
      getReportStatsData(),
      getOrganizationSettings(),
      resolveTemplate(profile.id, profile.department_ids),
      getOrgTemplatesWithFields(),
    ]);
  const stats = computeReportStats(statsRows, settings.timezone);
  const today = formatLongDate(new Date());
  const deadline = getDeadlineContext(settings);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {profile.full_name}
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
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
        <StatCard
          label="Current Streak"
          value={stats.currentStreak}
          unit="days"
          icon={<Flame className="size-3.5" />}
          valueClassName="text-4xl font-bold"
        />
        <StatCard
          label="This Month"
          value={stats.reportsThisMonth}
          unit="reports"
        />
        <StatCard
          label="30-day completion"
          value={`${stats.completionPercentage}%`}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "150ms" }}
      >
        <RecentReportsCard
          reports={preview.reports}
          viewAllHref="/reports"
          deadline={deadline}
          userName={profile.full_name}
          templates={templates}
        />
      </div>
    </div>
  );
}
