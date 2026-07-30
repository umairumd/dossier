import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/helpers/dates";
import { truncate } from "@/lib/helpers/text";
import { getReportField } from "@/lib/reports/fields";
import type { DailyReport } from "@/types/report";

const PREVIEW_LENGTH = 60;

export function ReportHistoryTable({ reports }: { reports: DailyReport[] }) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Submitted</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>{getReportField("content").label}</TableHead>
            <TableHead>{getReportField("blockers").label}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(report.submitted_at)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(report.report_date)}
              </TableCell>
              <TableCell className="max-w-xs whitespace-normal">
                {truncate(report.content, PREVIEW_LENGTH)}
              </TableCell>
              <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                {report.blockers
                  ? truncate(report.blockers, PREVIEW_LENGTH)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
