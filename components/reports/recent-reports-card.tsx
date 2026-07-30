import Link from "next/link";
import { Inbox } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportHistoryCards } from "@/components/reports/report-history-cards";
import { ReportHistoryTable } from "@/components/reports/report-history-table";
import type { DailyReport } from "@/types/report";

export function RecentReportsCard({
  reports,
  viewAllHref,
}: {
  reports: DailyReport[];
  viewAllHref?: string;
}) {
  return (
    <Card>
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
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No reports yet</p>
            <p className="text-sm text-muted-foreground">
              Your submitted daily reports will appear here.
            </p>
          </div>
        ) : (
          <>
            <ReportHistoryTable reports={reports} />
            <ReportHistoryCards reports={reports} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
