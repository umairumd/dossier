import { notFound } from "next/navigation";
import { Flame, Percent, Timer } from "lucide-react";
import { getTeamMemberOverview } from "@/lib/supabase/queries/manager/employee-overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportHistoryCards } from "@/components/reports/report-history-cards";
import { ReportHistoryTable } from "@/components/reports/report-history-table";
import { getRoleLabel } from "@/lib/helpers/role-labels";

export default async function ManagerEmployeeOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const overview = await getTeamMemberOverview(id);

  if (!overview) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {overview.full_name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{getRoleLabel(overview.role)}</span>
          <span>·</span>
          <span>
            {overview.department_names.join(", ") || "Unassigned"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Flame className="size-3.5" />
              Current Streak
            </CardDescription>
            <CardTitle className="text-3xl">
              {overview.current_streak}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {overview.current_streak === 1 ? "day" : "days"}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Percent className="size-3.5" />
              Completion (30 days)
            </CardDescription>
            <CardTitle className="text-3xl">
              {overview.completion_percentage}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Timer className="size-3.5" />
              Avg. Submission Time (30 days)
            </CardDescription>
            <CardTitle className="text-3xl">
              {overview.average_submission_time ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last 10 Reports</CardTitle>
          <CardDescription>
            {overview.report_count}{" "}
            {overview.report_count === 1 ? "report" : "reports"} submitted in
            total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recent_reports.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No reports submitted yet.
            </p>
          ) : (
            <>
              <ReportHistoryTable reports={overview.recent_reports} />
              <ReportHistoryCards reports={overview.recent_reports} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
