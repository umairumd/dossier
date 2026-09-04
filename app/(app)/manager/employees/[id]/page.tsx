import { notFound } from "next/navigation";
import { Flame, Percent, Timer } from "lucide-react";
import { getTeamMemberOverview } from "@/lib/supabase/queries/manager/employee-overview";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getOrgTemplatesWithFields } from "@/lib/supabase/queries/templates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { getRoleLabel } from "@/lib/helpers/role-labels";

export default async function ManagerEmployeeOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [overview, settings, templates] = await Promise.all([
    getTeamMemberOverview(id),
    getOrganizationSettings(),
    getOrgTemplatesWithFields(),
  ]);

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="card-gradient">
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

        <Card className="card-gradient">
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

        <Card className="card-gradient col-span-2 lg:col-span-1">
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
              <ReportHistoryBrowser
                reports={overview.recent_reports}
                userName={overview.full_name}
                deadline={getDeadlineContext(settings)}
                templates={templates}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
