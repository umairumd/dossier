import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SendReminderButton } from "@/components/manager/send-reminder-button";
import { formatDate } from "@/lib/helpers/dates";
import type { MissingReportRow } from "@/types/missing-report";

export function MissingReportsTable({
  rows,
  departmentName,
}: {
  rows: MissingReportRow[];
  departmentName: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Everyone on your team has submitted a report today.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Last Submitted</TableHead>
          <TableHead>Days Missed</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.employeeId}>
            <TableCell className="font-medium">{row.fullName}</TableCell>
            <TableCell className="text-muted-foreground">
              {departmentName}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.lastSubmittedDate
                ? formatDate(row.lastSubmittedDate)
                : "Never"}
            </TableCell>
            <TableCell>{row.daysMissed ?? "—"}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/manager/employees/${row.employeeId}`}>
                    View
                  </Link>
                </Button>
                <SendReminderButton fullName={row.fullName} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
