import { getTodayReport } from "@/lib/supabase/queries/reports";
import { SubmitReportCard } from "@/components/reports/submit-report-card";
import { TodayStatusCard } from "@/components/reports/today-status-card";

export default async function DailyReportPage() {
  const todayReport = await getTodayReport();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Daily Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Log today&apos;s progress for your manager to review.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TodayStatusCard report={todayReport} />
        <SubmitReportCard alreadySubmitted={!!todayReport} />
      </div>
    </div>
  );
}
