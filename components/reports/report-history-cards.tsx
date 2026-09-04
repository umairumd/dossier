"use client";

import { formatDate } from "@/lib/helpers/dates";
import { LocalTime } from "@/components/shared/local-time";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { Button } from "@/components/ui/button";
import type { DailyReport } from "@/types/report";
import type { DeadlineContext } from "@/lib/reports/submission-status";

export function ReportHistoryCards({
  reports,
  deadline,
  onView,
  templatesMap,
}: {
  reports: DailyReport[];
  deadline?: DeadlineContext;
  onView: (index: number) => void;
  templatesMap?: Map<string, string>;
}) {
  const showStatus = deadline !== undefined;

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {reports.map((report, index) => {
        const templateName = report.template_id
          ? templatesMap?.get(report.template_id)
          : undefined;

        return (
        <div key={report.id} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">
                {formatDate(report.report_date)}
              </span>
              {templateName && (
                <span className="text-xs text-muted-foreground">
                  {templateName}
                </span>
              )}
            </div>
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
                  deadline.deadlineHourUtc,
                  deadline,
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
        );
      })}
    </div>
  );
}
