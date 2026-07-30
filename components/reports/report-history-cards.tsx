import { formatDate, formatDateTime } from "@/lib/helpers/dates";
import { truncate } from "@/lib/helpers/text";
import type { DailyReport } from "@/types/report";

const PREVIEW_LENGTH = 80;

export function ReportHistoryCards({ reports }: { reports: DailyReport[] }) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {reports.map((report) => (
        <div key={report.id} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {formatDate(report.report_date)}
            </span>
            <span className="text-xs text-muted-foreground">
              Submitted {formatDateTime(report.submitted_at)}
            </span>
          </div>
          <p className="mt-2 text-sm">
            {truncate(report.content, PREVIEW_LENGTH)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Blockers:{" "}
            {report.blockers ? truncate(report.blockers, PREVIEW_LENGTH) : "None"}
          </p>
        </div>
      ))}
    </div>
  );
}
