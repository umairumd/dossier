"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LocalDateTime } from "@/components/shared/local-datetime";
import {
  getSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";
import { sortTeamMembersBySubmission } from "@/lib/helpers/team-sort";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

type StatusFilter = "all" | SubmissionStatus;

function memberStatus(
  member: TeamMemberReport,
  deadlineHourUtc: number,
): SubmissionStatus {
  return getSubmissionStatus(member.report?.submitted_at ?? null, deadlineHourUtc);
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === "missed") {
    return <Badge variant="secondary">{SUBMISSION_STATUS_LABELS.missed}</Badge>;
  }
  if (status === "late") {
    return <Badge variant="destructive">{SUBMISSION_STATUS_LABELS.late}</Badge>;
  }
  return <Badge>{SUBMISSION_STATUS_LABELS.on_time}</Badge>;
}

export function TeamReportsView({
  members,
  departmentName,
  deadlineHourUtc,
  adminView = false,
  emptyMessage,
  showFilters = true,
}: {
  members: TeamMemberReport[];
  departmentName: string;
  deadlineHourUtc: number;
  adminView?: boolean;
  emptyMessage?: string;
  showFilters?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!showFilters) {
      return members;
    }

    const normalized = query.trim().toLowerCase();
    let result = members;

    if (normalized) {
      result = result.filter((member) =>
        member.fullName.toLowerCase().includes(normalized),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (member) => memberStatus(member, deadlineHourUtc) === statusFilter,
      );
    }

    return sortTeamMembersBySubmission(result);
  }, [members, query, statusFilter, deadlineHourUtc, showFilters]);

  const submittedMembers = useMemo(
    () =>
      filtered.filter(
        (member): member is TeamMemberReport & { report: DailyReport } =>
          member.report !== null,
      ),
    [filtered],
  );

  const openReport = (employeeId: string) => {
    const index = submittedMembers.findIndex(
      (member) => member.employeeId === employeeId,
    );
    if (index !== -1) {
      setOpenIndex(index);
    }
  };

  const resolvedEmptyMessage =
    emptyMessage ??
    (members.length === 0
      ? "No employees are assigned to your department yet."
      : "No reports match your filters.");

  return (
    <div className="flex flex-col gap-4">
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search employees..."
              className="pl-8"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="on_time">{SUBMISSION_STATUS_LABELS.on_time}</SelectItem>
              <SelectItem value="late">{SUBMISSION_STATUS_LABELS.late}</SelectItem>
              <SelectItem value="missed">{SUBMISSION_STATUS_LABELS.missed}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {resolvedEmptyMessage}
        </p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px] text-muted-foreground font-medium">
                    Employee
                  </TableHead>
                  <TableHead className="w-[120px] text-muted-foreground font-medium">
                    Status
                  </TableHead>
                  <TableHead className="w-[200px] text-muted-foreground font-medium">
                    Submitted
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => {
                  const status = memberStatus(member, deadlineHourUtc);

                  // A clickable <tr> has no native keyboard equivalent —
                  // role="button" + tabIndex + onKeyDown make it operable
                  // by keyboard/screen-reader users, matching the mobile
                  // card view below, which already used a real <button>.
                  return (
                    <TableRow
                      key={member.employeeId}
                      className={
                        member.report
                          ? "cursor-pointer hover:bg-muted/50 transition-colors"
                          : "hover:bg-muted/50 transition-colors"
                      }
                      role={member.report ? "button" : undefined}
                      tabIndex={member.report ? 0 : undefined}
                      aria-label={
                        member.report
                          ? `View ${member.fullName}'s report`
                          : undefined
                      }
                      onClick={() =>
                        member.report && openReport(member.employeeId)
                      }
                      onKeyDown={(event) => {
                        if (
                          member.report &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          openReport(member.employeeId);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <EmployeeNameLink
                          employeeId={member.employeeId}
                          fullName={member.fullName}
                          basePath={
                            adminView ? "/admin/employees" : "/manager/employees"
                          }
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
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((member) => {
              const status = memberStatus(member, deadlineHourUtc);

              return (
                <div
                  key={member.employeeId}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <EmployeeNameLink
                      employeeId={member.employeeId}
                      fullName={member.fullName}
                      className="text-sm font-medium hover:underline"
                      basePath={
                        adminView ? "/admin/employees" : "/manager/employees"
                      }
                    />
                    <StatusBadge status={status} />
                  </div>
                  <button
                    type="button"
                    disabled={!member.report}
                    onClick={() => openReport(member.employeeId)}
                    className="mt-2 w-full text-left text-xs text-muted-foreground disabled:cursor-default"
                  >
                    {member.report ? (
                      <>
                        Submitted{" "}
                        <LocalDateTime isoString={member.report.submitted_at} />
                      </>
                    ) : (
                      "No report"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ReportDetailSheet
        members={submittedMembers}
        departmentName={departmentName}
        index={openIndex}
        onIndexChange={setOpenIndex}
      />
    </div>
  );
}
