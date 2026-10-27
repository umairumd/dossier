"use client";

import {
  DataList,
  DataListChevron,
  DataListRow,
} from "@/components/shared/data-list";
import { DateTile } from "@/components/shared/date-tile";
import { LocalTime } from "@/components/shared/local-time";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";

const COLUMNS = "minmax(0,1fr) 7.5rem 7rem 1.25rem";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });

function weekday(date: string): string {
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

function shortTemplateName(name: string): string {
  return name.endsWith(" Template") ? name.slice(0, -" Template".length) : name;
}

// A person's reports, newest first: date, weekday and template, status,
// time. The report's own text stays in the reader. The whole row opens the reader. Lives inside a
// Card (My Reports, home, profiles), so the list is bare.
export function ReportHistoryList({
  reports,
  deadline,
  templates,
  onView,
}: {
  reports: DailyReport[];
  deadline?: DeadlineContext;
  templates?: ReportTemplateWithFields[];
  onView: (index: number) => void;
}) {
  const names = new Map((templates ?? []).map((template) => [template.id, template.name]));

  return (
    <DataList
      variant="bare"
      columns={COLUMNS}
      header={["Report", deadline ? "Status" : "", "Submitted", ""]}
    >
      {reports.map((report, index) => {
        const template = report.template_id ? names.get(report.template_id) : undefined;
        const time = report.submitted_at ? <LocalTime isoString={report.submitted_at} /> : null;
        return (
          <DataListRow
            key={report.id}
            onClick={() => onView(index)}
            label={`Open report from ${report.report_date}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <DateTile date={report.report_date} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {weekday(report.report_date)}
                </span>
                <span className="truncate text-[13px] text-muted-foreground">
                  {template ? shortTemplateName(template) : "Report"}
                  {time && (
                    <span className="md:hidden">
                      {" · "}
                      {time}
                    </span>
                  )}
                </span>
              </span>
            </span>
            <span>
              {deadline ? (
                <SubmissionStatusBadge
                  status={getSubmissionStatus(
                    report.submitted_at,
                    deadline.deadlineHourUtc,
                    deadline,
                    report.report_date,
                  )}
                />
              ) : null}
            </span>
            <span className="hidden text-[13px] tabular-nums text-muted-foreground md:block">
              {time ?? "—"}
            </span>
            <DataListChevron />
          </DataListRow>
        );
      })}
    </DataList>
  );
}
