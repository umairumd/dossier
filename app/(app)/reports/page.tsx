import Link from "next/link";
import { getTodayReport, getReportHistory } from "@/lib/supabase/queries/reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getOrganizationSettings,
  getDeadlineContext,
} from "@/lib/supabase/queries/organization-settings";
import { formatDeadlineHint } from "@/lib/helpers/time";
import { ReportBanner } from "@/components/shared/report-banner";
import { PageHeader } from "@/components/shared/page-header";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { ReportSearch } from "@/components/reports/report-search";
import { EmptyState } from "@/components/shared/empty-state";
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

  const [todayReport, history, settings, profile] = await Promise.all([
    getTodayReport(),
    getReportHistory(page, PAGE_SIZE),
    getOrganizationSettings(),
    getCurrentProfile(),
  ]);

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
      />

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Report History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ReportSearch
            deadline={deadline}
            userName={profile?.full_name ?? ""}
          >
            {reportHistory.length === 0 && page === 1 ? (
              <EmptyState
                title="No reports submitted yet."
                description="Submit your first daily report above."
                className="py-8"
              />
            ) : reportHistory.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm text-muted-foreground">No more reports.</p>
                <Link
                  href="/reports"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back to My Reports
                </Link>
              </div>
            ) : (
              <>
                <ReportHistoryBrowser
                  reports={reportHistory}
                  deadline={deadline}
                  userName={profile?.full_name ?? ""}
                  showProfileLink={false}
                />

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border py-4">
                    <p className="text-xs text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      {page > 1 && (
                        <Link
                          href={`/reports?page=${page - 1}`}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          ← Previous
                        </Link>
                      )}
                      {page < totalPages && (
                        <Link
                          href={`/reports?page=${page + 1}`}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Next →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </ReportSearch>
        </CardContent>
      </Card>
    </div>
  );
}
