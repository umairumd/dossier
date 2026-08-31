import { getTodayReport } from "@/lib/supabase/queries/reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { SubmitReportCard } from "@/components/reports/submit-report-card";
import { TodayStatusCard } from "@/components/reports/today-status-card";

export default async function DailyReportPage() {
  const [todayReport, profile] = await Promise.all([
    getTodayReport(),
    getCurrentProfile(),
  ]);

  const isPrivileged =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "manager";

  const subtitle = isPrivileged
    ? "Log today's progress."
    : "Log today's progress for your manager to review.";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Daily Report
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TodayStatusCard report={todayReport} />
        <SubmitReportCard
          alreadySubmitted={!!todayReport}
          isAdmin={isPrivileged}
        />
      </div>
    </div>
  );
}
