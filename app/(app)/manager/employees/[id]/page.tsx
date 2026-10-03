import { notFound } from "next/navigation";
import { Clock, FileText, Flame, Percent } from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getTeamMemberOverview } from "@/lib/supabase/queries/manager/employee-overview";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
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
import { PageHeader } from "@/components/shared/page-header";

export default async function ManagerEmployeeOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [overview, settings, templates, profile] = await Promise.all([
    getTeamMemberOverview(id),
    getOrganizationSettings(),
    getOrgTemplatesWithFields(),
    getCurrentProfile(),
  ]);

  if (!overview) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={overview.full_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{getRoleLabel(overview.role)}</span>
            <span>·</span>
            <span>
              {overview.department_names.join(", ") || "Unassigned"}
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Completion"
          value={`${overview.completion_percentage}%`}
          icon={<Percent size={14} />}
          className="card-gradient"
        />
        <StatCard
          label="Current Streak"
          value={overview.current_streak}
          unit={overview.current_streak === 1 ? "day" : "days"}
          icon={<Flame size={14} />}
          className="card-gradient"
        />
        <StatCard
          label="Avg. Submission Time"
          value={overview.average_submission_time ?? "—"}
          icon={<Clock size={14} />}
          className="card-gradient col-span-2 lg:col-span-1"
        />
      </div>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Last 10 Reports</CardTitle>
          <CardDescription>
            {overview.report_count}{" "}
            {overview.report_count === 1 ? "report" : "reports"} submitted in
            total.
          </CardDescription>
        </CardHeader>
        <CardContent className="pr-0">
          {overview.recent_reports.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<FileText className="size-4" />}
              title="No reports submitted yet."
            />
          ) : (
            <>
              <ReportHistoryBrowser
                reports={overview.recent_reports}
                userName={overview.full_name}
                deadline={getDeadlineContext(settings)}
                templates={templates}
                viewerRole={profile?.role}
                currentUserId={profile?.id}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
