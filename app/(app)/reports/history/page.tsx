import { getReportHistory } from "@/lib/supabase/queries/reports";
import { RecentReportsCard } from "@/components/reports/recent-reports-card";

export default async function ReportHistoryPage() {
  const reportHistory = await getReportHistory();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Report History
        </h1>
        <p className="text-sm text-muted-foreground">
          Every daily report you&apos;ve submitted, newest first.
        </p>
      </div>

      <RecentReportsCard reports={reportHistory} />
    </div>
  );
}
