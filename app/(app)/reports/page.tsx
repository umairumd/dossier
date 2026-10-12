import Link from "next/link";
import {
  getMyReportById,
  getTodayReport,
  getReportHistory,
} from "@/lib/supabase/queries/reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getOrgTemplatesWithFields,
  resolveTemplate,
} from "@/lib/supabase/queries/templates";
import { getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getAttendanceSettings } from "@/lib/supabase/queries/attendance";
import { ReportsToday } from "@/components/reports/today-report";
import { PageHeader } from "@/components/shared/page-header";
import { getHomeDay } from "@/lib/supabase/queries/home";
import { getCommentsForReports } from "@/lib/supabase/queries/report-comments";
import { REPORT_PAGE_SIZE } from "@/lib/reports/constants";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { ReportHistoryPagination } from "@/components/reports/report-history-pagination";
import { ReportSearch } from "@/components/reports/report-search";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";


export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string; report?: string }>;
}) {
  const { page: pageParam, view, report } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  // One round of reads; the template chains off the profile inside it.
  const profileP = getCurrentProfile();
  const historyP = getReportHistory(page, REPORT_PAGE_SIZE);
  const viewReportP = view ? getMyReportById(view) : Promise.resolve(null);
  const [todayReport, history, day, profile, templates, viewReport, attendanceSettings, resolved, comments] =
    await Promise.all([
      getTodayReport(),
      historyP,
      getHomeDay(),
      profileP,
      getOrgTemplatesWithFields(),
      viewReportP,
      getAttendanceSettings(),
      profileP.then((p) => (p ? resolveTemplate(p.id, p.department_ids) : null)),
      // Comments for the listed reports, so a report opens with them in place.
      Promise.all([historyP, viewReportP]).then(([h, v]) =>
        getCommentsForReports([...new Set([...h.reports.map((r) => r.id), ...(v ? [v.id] : [])])]),
      ),
    ]);

  const template = resolved ?? undefined;
  const { reports: reportHistory, total } = history;
  const { settings, todayDate: today, isOffDay, onFullDayLeave } = day;
  const deadline = getDeadlineContext(settings);
  const totalPages = Math.ceil(total / REPORT_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Reports" />

      {/* People excluded from reporting keep their history (old links and
          comments still open here) but have nothing to write today. */}
      {profile && profile.is_reporting && (
        <ReportsToday
          initialOpen={report === "open"}
          userId={profile.id}
          todayReport={todayReport}
          template={template}
          isOffDay={isOffDay}
          onFullDayLeave={onFullDayLeave}
          orgDate={today}
          timeZone={settings.timezone}
          deadlineHourLocal={settings.reportDeadlineHourLocal}
          shiftFulltimeStart={attendanceSettings.shiftFulltimeStart}
        />
      )}

      <Card>
        <CardTitleHeader title="Report history" />
        <CardContent className="flex flex-col gap-4">
          <ReportSearch
            deadline={deadline}
            userName={profile?.full_name ?? ""}
            avatar={profile?.avatar}
            templates={templates}
            viewerRole={profile?.role}
            currentUserId={profile?.id}
          >
            {reportHistory.length === 0 && page === 1 && !viewReport ? (
              <EmptyState
                illustration="reports"
                title="No reports submitted yet."
                description="Submit your first daily report above."
                className="py-8"
              />
            ) : reportHistory.length === 0 && !viewReport ? (
              <EmptyState
                illustration="reports"
                title="No more reports."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/reports">Back to My Reports</Link>
                  </Button>
                }
              />
            ) : reportHistory.length === 0 && viewReport ? (
              <ReportHistoryBrowser
                reports={[]}
                deadline={deadline}
                userName={profile?.full_name ?? ""}
                avatar={profile?.avatar}
                showProfileLink={false}
                templates={templates}
                isOwnReport
                viewerRole={profile?.role}
                currentUserId={profile?.id}
                initialViewId={view}
                viewReport={viewReport}
                comments={comments}
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
                avatar={profile?.avatar}
                  showProfileLink={false}
                  templates={templates}
                  isOwnReport
                  viewerRole={profile?.role}
                  currentUserId={profile?.id}
                  initialViewId={view}
                  viewReport={viewReport}
                comments={comments}
                />
              </ReportHistoryPagination>
            )}
          </ReportSearch>
        </CardContent>
      </Card>
    </div>
  );
}
