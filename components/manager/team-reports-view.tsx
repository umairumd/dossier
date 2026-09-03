"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { LocalDateTime } from "@/components/shared/local-datetime";
import {
  getSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type DeadlineContext,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";
import { sortTeamMembersBySubmission } from "@/lib/helpers/team-sort";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { EmptyState } from "@/components/shared/empty-state";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

type StatusFilter = "all" | SubmissionStatus;

function memberStatus(
  member: TeamMemberReport,
  deadline: DeadlineContext,
): SubmissionStatus {
  return getSubmissionStatus(
    member.report?.submitted_at ?? null,
    deadline.deadlineHourUtc,
    deadline,
  );
}

export function TeamReportsView({
  members,
  deadline,
  adminView = false,
  emptyMessage,
  showFilters = true,
}: {
  members: TeamMemberReport[];
  deadline: DeadlineContext;
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
        (member) => memberStatus(member, deadline) === statusFilter,
      );
    }

    return sortTeamMembersBySubmission(result);
  }, [members, query, statusFilter, deadline, showFilters]);

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
        <EmptyState title={resolvedEmptyMessage} />
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
                  <TableHead className="w-[60px] text-right text-muted-foreground font-medium">
                    {""}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => {
                  const status = memberStatus(member, deadline);

                  return (
                    <TableRow
                      key={member.employeeId}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-0.5">
                          <EmployeeNameLink
                            employeeId={member.employeeId}
                            fullName={member.fullName}
                            basePath={
                              adminView ? "/admin/employees" : "/manager/employees"
                            }
                          />
                          {member.designation && (
                            <span className="text-xs text-muted-foreground">
                              {member.designation}
                            </span>
                          )}
                        </div>
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
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openReport(member.employeeId)}
                          disabled={!member.report}
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

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((member) => {
              const status = memberStatus(member, deadline);

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
                    <SubmissionStatusBadge status={status} />
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
        index={openIndex}
        onIndexChange={setOpenIndex}
        deadline={deadline}
        adminView={adminView}
      />
    </div>
  );
}
