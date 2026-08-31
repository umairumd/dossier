import { Building2 } from "lucide-react";
import { getReportHistory, getTodayReport } from "@/lib/supabase/queries/reports";
import type { ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { formatLongDate } from "@/lib/helpers/dates";
import { computeReportStats } from "@/lib/helpers/report-stats";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/analytics/stat-card";
import { RecentReportsCard } from "@/components/reports/recent-reports-card";
import { SubmitReportCard } from "@/components/reports/submit-report-card";
import { TodayStatusCard } from "@/components/reports/today-status-card";

const RECENT_PREVIEW_SIZE = 5;

export async function EmployeeDashboard({
  profile,
}: {
  profile: ProfileWithDepartment;
}) {
  const [todayReport, reportHistory] = await Promise.all([
    getTodayReport(),
    getReportHistory(),
  ]);
  const stats = computeReportStats(reportHistory);
  const today = formatLongDate(new Date());

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

      <div className="grid gap-4 md:grid-cols-2">
        <TodayStatusCard report={todayReport} />
        <SubmitReportCard alreadySubmitted={!!todayReport} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Current Streak" value={stats.currentStreak} unit="days" />
        <StatCard label="Monthly Completion" value={`${stats.completionPercentage}%`} />
      </div>

      <RecentReportsCard
        reports={reportHistory.slice(0, RECENT_PREVIEW_SIZE)}
        viewAllHref="/reports/history"
      />
    </div>
  );
}
