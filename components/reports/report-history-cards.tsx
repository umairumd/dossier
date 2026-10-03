"use client";

import { DateTile } from "@/components/shared/date-tile";
import { ListRow } from "@/components/shared/list-row";
import { LocalTime } from "@/components/shared/local-time";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { DailyReport } from "@/types/report";

function formatWeekday(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

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
    <div className="-ml-(--card-spacing) divide-y divide-border border-t border-border md:hidden">
      {reports.map((report, index) => {
        const templateName = report.template_id
          ? templatesMap?.get(report.template_id)
          : undefined;

        return (
          <ListRow
            key={report.id}
            leading={<DateTile date={report.report_date} />}
            title={templateName ?? "Report"}
            meta={[
              formatWeekday(report.report_date),
              report.submitted_at ? (
                <LocalTime key="time" isoString={report.submitted_at} />
              ) : (
                "—"
              ),
            ]}
            trailing={
              showStatus ? (
                <SubmissionStatusBadge
                  status={getSubmissionStatus(
                    report.submitted_at,
                    deadline.deadlineHourUtc,
                    deadline,
                  )}
                />
              ) : null
            }
            onClick={() => onView(index)}
          />
        );
      })}
    </div>
  );
}
