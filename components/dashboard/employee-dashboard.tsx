import { Building2, Flame } from "lucide-react";
import { getReportHistory, getTodayReport } from "@/lib/supabase/queries/reports";
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
  const [todayReport, reportHistory, settings] = await Promise.all([
    getTodayReport(),
    getReportHistory(),
    getOrganizationSettings(),
  ]);
  const stats = computeReportStats(reportHistory, settings.timezone);
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
      />

      <ActivityStrip
        reports={reportHistory}
        timezone={settings.timezone}
        workingDays={settings.workingDays}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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

      <RecentReportsCard
        reports={reportHistory.slice(0, RECENT_PREVIEW_SIZE)}
        viewAllHref="/reports/history"
        deadline={deadline}
        userName={profile.full_name}
      />
    </div>
  );
}
