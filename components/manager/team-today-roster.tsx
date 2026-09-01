import { Badge } from "@/components/ui/badge";
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
import { LocalDateTime } from "@/components/shared/local-datetime";
import { sortTeamMembersBySubmission } from "@/lib/helpers/team-sort";
import {
  getSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";
import type { TeamMemberReport } from "@/types/team";

function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === "missed") {
    return <Badge variant="secondary">{SUBMISSION_STATUS_LABELS.missed}</Badge>;
  }
  if (status === "late") {
    return <Badge variant="destructive">{SUBMISSION_STATUS_LABELS.late}</Badge>;
  }
  return <Badge>{SUBMISSION_STATUS_LABELS.on_time}</Badge>;
}

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
          <p className="py-6 text-center text-sm text-muted-foreground">
            No teammates to show.
          </p>
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
                      <StatusBadge status={status} />
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
