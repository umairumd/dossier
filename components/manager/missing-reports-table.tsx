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
import { formatDate } from "@/lib/helpers/dates";
import { EmptyState } from "@/components/shared/empty-state";
import type { MissingReportRow } from "@/types/missing-report";

export function MissingReportsTable({
  rows,
  departmentName,
  teamSize,
  basePath = "/manager/employees",
  emptyTeamMessage = "No team members are assigned to your department yet.",
}: {
  rows: MissingReportRow[];
  departmentName: string;
  teamSize: number;
  basePath?: string;
  emptyTeamMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={
          teamSize === 0
            ? emptyTeamMessage
            : "Everyone on your team has submitted a report today."
        }
      />
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
            <TableCell className="text-right">
              <Button variant="outline" size="sm" asChild>
                <Link href={`${basePath}/${row.employeeId}`}>
                  View Profile
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
