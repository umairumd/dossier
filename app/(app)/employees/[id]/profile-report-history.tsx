import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { ReportHistoryPagination } from "@/components/reports/report-history-pagination";
import { CardSkeleton, ReportHistorySkeleton } from "@/components/shared/skeletons";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
import { REPORT_PAGE_SIZE } from "@/lib/reports/constants";
import { getCommentsForReports } from "@/lib/supabase/queries/report-comments";
import { getDeadlineContext, getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getReportsForAuthor } from "@/lib/supabase/queries/reports";
import { getOrgTemplatesWithFields } from "@/lib/supabase/queries/templates";
import type { UserRole } from "@/types/profile";

/**
 * The report history card on an employee profile (both the admin and the
 * team view). It loads on its own, in a Suspense boundary, so the rest of
 * the profile doesn't wait for it: a page of reports, their comments, and the
 * cached settings and templates.
 */
export async function ProfileReportHistory({
  authorId,
  page,
  reportCount,
  userName,
  avatar,
  adminView = false,
  viewerRole,
  currentUserId,
}: {
  authorId: string;
  page: number;
  reportCount: number;
  userName: string;
  avatar?: unknown;
  adminView?: boolean;
  viewerRole?: UserRole;
  currentUserId?: string;
}) {
  const historyP = getReportsForAuthor(authorId, page);
  const [history, comments, settings, templates] = await Promise.all([
    historyP,
    historyP.then((h) => getCommentsForReports(h.reports.map((r) => r.id))),
    getOrganizationSettings(),
    getOrgTemplatesWithFields(),
  ]);

  return (
    <Card className="rise-in">
      <CardTitleHeader title="Report history" aside={`${reportCount} total`} />
      <CardContent>
        {history.total === 0 ? (
          <EmptyState
            size="sm"
            icon={<FileText className="size-4" />}
            title="No reports submitted yet."
          />
        ) : (
          <ReportHistoryPagination
            page={page}
            totalPages={Math.ceil(history.total / REPORT_PAGE_SIZE)}
            baseHref={`/employees/${authorId}`}
            rowCount={history.reports.length}
          >
            <ReportHistoryBrowser
              reports={history.reports}
              userName={userName}
              avatar={avatar}
              deadline={getDeadlineContext(settings)}
              adminView={adminView}
              templates={templates}
              viewerRole={viewerRole}
              currentUserId={currentUserId}
              comments={comments}
            />
          </ReportHistoryPagination>
        )}
      </CardContent>
    </Card>
  );
}

/** Same frame as the card while it loads. */
export function ProfileReportHistorySkeleton() {
  return (
    <CardSkeleton label="Report history">
      <ReportHistorySkeleton rows={5} />
    </CardSkeleton>
  );
}
