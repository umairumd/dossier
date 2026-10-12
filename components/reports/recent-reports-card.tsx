import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardFooterLink,
  CardTitleHeader,
} from "@/components/ui/card";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import type { DailyReport, ReportComment } from "@/types/report";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

export function RecentReportsCard({
  reports,
  viewAllHref,
  deadline,
  userName,
  avatar,
  templates,
  viewerRole,
  currentUserId,
  comments,
}: {
  /** Comments for these reports, loaded with the card. */
  comments?: Record<string, ReportComment[]>;
  reports: DailyReport[];
  viewAllHref?: string;
  deadline: DeadlineContext;
  userName: string;
  avatar?: unknown;
  templates?: ReportTemplateWithFields[];
  viewerRole?: UserRole;
  currentUserId?: string;
}) {
  return (
    <Card>
      <CardTitleHeader title="Your recent reports" />
      <CardContent>
        {reports.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Inbox className="size-4" />}
            title="No reports yet"
            description="Your submitted daily reports will appear here."
          />
        ) : (
          <ReportHistoryBrowser
            reports={reports}
            userName={userName}
            avatar={avatar}
            deadline={deadline}
            showProfileLink={false}
            templates={templates}
            isOwnReport
            viewerRole={viewerRole}
            currentUserId={currentUserId}
            comments={comments}
          />
        )}
      </CardContent>
      {viewAllHref && reports.length > 0 && (
        <CardFooterLink href={viewAllHref}>All reports</CardFooterLink>
      )}
    </Card>
  );
}
