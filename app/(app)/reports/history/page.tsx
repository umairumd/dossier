import { getReportHistory } from "@/lib/supabase/queries/reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { computeReportStats } from "@/lib/helpers/report-stats";
import { RecentReportsCard } from "@/components/reports/recent-reports-card";
import { PageHeader } from "@/components/shared/page-header";

export default async function ReportHistoryPage() {
  const [reportHistory, settings] = await Promise.all([
    getReportHistory(),
    getOrganizationSettings(),
  ]);
  const stats = computeReportStats(reportHistory);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Report History">
        <p className="text-sm text-muted-foreground">
          Every daily report you&apos;ve submitted, newest first.
        </p>
        <div className="mt-4 flex flex-wrap items-baseline gap-6 text-sm">
          <p>
            <span className="font-semibold">{stats.currentStreak}</span>{" "}
            <span className="text-muted-foreground">day streak</span>
          </p>
          <p>
            <span className="font-semibold">{stats.reportsThisMonth}</span>{" "}
            <span className="text-muted-foreground">this month</span>
          </p>
          <p>
            <span className="font-semibold">{stats.completionPercentage}%</span>{" "}
            <span className="text-muted-foreground">30-day completion</span>
          </p>
        </div>
      </PageHeader>

      <RecentReportsCard
        reports={reportHistory}
        deadlineHourUtc={settings.reportDeadlineHourUtc}
      />
    </div>
  );
}
