import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/helpers/dates";
import { LocalDateTime } from "@/components/shared/local-datetime";
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
            <TableHead>{getReportField("additional_notes").label}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                <LocalDateTime isoString={report.submitted_at} />
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
              <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                {report.additional_notes
                  ? truncate(report.additional_notes, PREVIEW_LENGTH)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
