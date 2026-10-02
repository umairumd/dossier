import Link from "next/link";
import { getTodayReport, getReportHistory } from "@/lib/supabase/queries/reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getOrgTemplatesWithFields,
  resolveTemplate,
} from "@/lib/supabase/queries/templates";
import {
  getOrganizationSettings,
  getDeadlineContext,
} from "@/lib/supabase/queries/organization-settings";
import { formatDeadlineHint } from "@/lib/helpers/time";
import { ReportBanner } from "@/components/shared/report-banner";
import { PageHeader } from "@/components/shared/page-header";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { ReportHistoryPagination } from "@/components/reports/report-history-pagination";
import { ReportSearch } from "@/components/reports/report-search";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PAGE_SIZE = 10;

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const [todayReport, history, settings, profile, templates] = await Promise.all([
    getTodayReport(),
    getReportHistory(page, PAGE_SIZE),
    getOrganizationSettings(),
    getCurrentProfile(),
    getOrgTemplatesWithFields(),
  ]);

  const template = profile
    ? ((await resolveTemplate(profile.id, profile.department_ids)) ?? undefined)
    : undefined;

  const { reports: reportHistory, total } = history;
  const deadline = getDeadlineContext(settings);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Reports" />

      <ReportBanner
        todayReport={todayReport}
        deadlineHint={formatDeadlineHint(
          settings.reportDeadlineHourLocal,
          settings.timezone,
        )}
        deadline={deadline}
        hideHistoryLink={true}
        template={template}
      />

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Report History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ReportSearch
            deadline={deadline}
            userName={profile?.full_name ?? ""}
            templates={templates}
            viewerRole={profile?.role}
            currentUserId={profile?.id}
          >
            {reportHistory.length === 0 && page === 1 ? (
              <EmptyState
                illustration="reports"
                title="No reports submitted yet."
                description="Submit your first daily report above."
                className="py-8"
              />
            ) : reportHistory.length === 0 ? (
              <EmptyState
                illustration="reports"
                title="No more reports."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/reports">Back to My Reports</Link>
                  </Button>
                }
              />
            ) : (
              <ReportHistoryPagination
                page={page}
                totalPages={totalPages}
                rowCount={reportHistory.length}
              >
                <ReportHistoryBrowser
                  reports={reportHistory}
                  deadline={deadline}
                  userName={profile?.full_name ?? ""}
                  showProfileLink={false}
                  templates={templates}
                  isOwnReport
                  viewerRole={profile?.role}
                  currentUserId={profile?.id}
                />
              </ReportHistoryPagination>
            )}
          </ReportSearch>
        </CardContent>
      </Card>
    </div>
  );
}
