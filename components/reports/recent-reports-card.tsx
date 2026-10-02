import Link from "next/link";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import type { DailyReport } from "@/types/report";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

export function RecentReportsCard({
  reports,
  viewAllHref,
  deadline,
  userName,
  templates,
  viewerRole,
  currentUserId,
}: {
  reports: DailyReport[];
  viewAllHref?: string;
  deadline: DeadlineContext;
  userName: string;
  templates?: ReportTemplateWithFields[];
  viewerRole?: UserRole;
  currentUserId?: string;
}) {
  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle>Recent Reports</CardTitle>
        <CardDescription>Your last few daily reports.</CardDescription>
        {viewAllHref && (
          <CardAction>
            <Link
              href={viewAllHref}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              View all
            </Link>
          </CardAction>
        )}
      </CardHeader>
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
            deadline={deadline}
            showProfileLink={false}
            templates={templates}
            isOwnReport
            viewerRole={viewerRole}
            currentUserId={currentUserId}
          />
        )}
      </CardContent>
    </Card>
  );
}
