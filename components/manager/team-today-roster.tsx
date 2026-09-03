import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { EmptyState } from "@/components/shared/empty-state";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { sortTeamMembersBySubmission } from "@/lib/helpers/team-sort";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import type { TeamMemberReport } from "@/types/team";

export function TeamTodayRoster({
  members,
  deadlineHourUtc,
}: {
  members: TeamMemberReport[];
  deadlineHourUtc: number;
}) {
  const sorted = sortTeamMembersBySubmission(members);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roster</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState title="No teammates to show." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((member) => {
                const status = getSubmissionStatus(
                  member.report?.submitted_at ?? null,
                  deadlineHourUtc,
                );

                return (
                  <TableRow key={member.employeeId}>
                    <TableCell>
                      <EmployeeNameLink
                        employeeId={member.employeeId}
                        fullName={member.fullName}
                        className="font-medium hover:underline"
                      />
                    </TableCell>
                    <TableCell>
                      <SubmissionStatusBadge status={status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.report ? (
                        <LocalDateTime isoString={member.report.submitted_at} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
