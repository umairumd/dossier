"use client";

import { formatDate } from "@/lib/helpers/dates";
import { LocalTime } from "@/components/shared/local-time";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { Button } from "@/components/ui/button";
import type { DailyReport } from "@/types/report";

export function ReportHistoryCards({
  reports,
  deadlineHourUtc,
  onView,
}: {
  reports: DailyReport[];
  deadlineHourUtc?: number;
  onView: (index: number) => void;
}) {
  const showStatus = deadlineHourUtc !== undefined;

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {reports.map((report, index) => (
        <div key={report.id} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {formatDate(report.report_date)}
            </span>
            <span className="text-xs text-muted-foreground">
              {report.submitted_at ? (
                <LocalTime isoString={report.submitted_at} />
              ) : (
                "—"
              )}
            </span>
          </div>
          {showStatus && (
            <div className="mt-2">
              <SubmissionStatusBadge
                status={getSubmissionStatus(
                  report.submitted_at,
                  deadlineHourUtc,
                )}
              />
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 px-0"
            onClick={() => onView(index)}
          >
            View
          </Button>
        </div>
      ))}
    </div>
  );
}
