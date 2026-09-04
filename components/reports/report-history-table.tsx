"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/helpers/dates";
import { LocalTime } from "@/components/shared/local-time";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import type { DailyReport } from "@/types/report";
import type { DeadlineContext } from "@/lib/reports/submission-status";

export function ReportHistoryTable({
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
    <div className="hidden md:block">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="text-muted-foreground font-medium">
              Date
            </TableHead>
            {showStatus && (
              <TableHead className="w-[120px] text-muted-foreground font-medium">
                Status
              </TableHead>
            )}
            <TableHead className="w-[140px] text-muted-foreground font-medium">
              Time
            </TableHead>
            <TableHead className="w-[60px] text-right text-muted-foreground font-medium">
              {""}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report, index) => {
            const templateName = report.template_id
              ? templatesMap?.get(report.template_id)
              : undefined;

            return (
            <TableRow
              key={report.id}
              className="transition-colors hover:bg-muted/50"
            >
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="whitespace-nowrap text-sm">
                    {formatDate(report.report_date)}
                  </span>
                  {templateName && (
                    <span className="text-xs text-muted-foreground">
                      {templateName}
                    </span>
                  )}
                </div>
              </TableCell>
              {showStatus && (
                <TableCell>
                  <SubmissionStatusBadge
                    status={getSubmissionStatus(
                      report.submitted_at,
                      deadline.deadlineHourUtc,
                      deadline,
                    )}
                  />
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {report.submitted_at ? (
                  <LocalTime isoString={report.submitted_at} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(index)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
