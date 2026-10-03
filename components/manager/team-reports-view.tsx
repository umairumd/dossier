"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { LocalTime } from "@/components/shared/local-time";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  getSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type DeadlineContext,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";
import { sortTeamMembersBySubmission } from "@/lib/helpers/team-sort";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import {
  ManagerIndicator,
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import {
  EmptyState,
  illustrationForTeamEmpty,
} from "@/components/shared/empty-state";
import {
  FilterToolbar,
  filterSelectTriggerClassName,
} from "@/components/shared/filter-toolbar";
import { ListGroupCard } from "@/components/shared/list-group-card";
import { ListRow } from "@/components/shared/list-row";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

type StatusFilter = "all" | SubmissionStatus;

function memberStatus(
  member: TeamMemberReport,
  deadline: DeadlineContext,
  reportDate?: string,
): SubmissionStatus {
  return getSubmissionStatus(
    member.report?.submitted_at ?? null,
    deadline.deadlineHourUtc,
    deadline,
    reportDate,
    member.isOnLeave,
  );
}

function NameIndicators({
  isManager,
  isRemote,
  employmentType,
}: {
  isManager: boolean;
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
}) {
  return (
    <>
      {isManager && <ManagerIndicator />}
      {isRemote && <RemoteIndicator />}
      {employmentType === "part_time" && <PartTimeIndicator />}
    </>
  );
}

export function TeamReportsView({
  members,
  deadline,
  adminView = false,
  emptyMessage,
  showFilters = true,
  managerId,
  templates,
  reportDate,
  viewerRole,
  currentUserId,
  groupTitle,
  groupAside,
}: {
  members: TeamMemberReport[];
  deadline: DeadlineContext;
  adminView?: boolean;
  emptyMessage?: string;
  showFilters?: boolean;
  managerId?: string;
  templates?: ReportTemplateWithFields[];
  reportDate?: string;
  viewerRole?: UserRole;
  currentUserId?: string;
  groupTitle?: string;
  groupAside?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let result = members;

    if (showFilters) {
      const normalized = query.trim().toLowerCase();

      if (normalized) {
        result = result.filter((member) =>
          member.fullName.toLowerCase().includes(normalized),
        );
      }

      if (statusFilter !== "all") {
        result = result.filter(
          (member) => memberStatus(member, deadline, reportDate) === statusFilter,
        );
      }

      result = sortTeamMembersBySubmission(result);
    }

    if (managerId) {
      result = [...result].sort((a, b) => {
        const aIsManager = a.employeeId === managerId ? -1 : 0;
        const bIsManager = b.employeeId === managerId ? -1 : 0;
        return aIsManager - bIsManager;
      });
    }

    return result;
  }, [members, query, statusFilter, deadline, showFilters, managerId, reportDate]);

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
        <FilterToolbar
          search={
            <div className="relative min-w-0">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search employees..."
                className="pl-8"
              />
            </div>
          }
          filters={[
            <Select
              key="status"
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className={filterSelectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="on_time">{SUBMISSION_STATUS_LABELS.on_time}</SelectItem>
                <SelectItem value="late">{SUBMISSION_STATUS_LABELS.late}</SelectItem>
                <SelectItem value="pending">{SUBMISSION_STATUS_LABELS.pending}</SelectItem>
                <SelectItem value="missed">{SUBMISSION_STATUS_LABELS.missed}</SelectItem>
                <SelectItem value="on_leave">{SUBMISSION_STATUS_LABELS.on_leave}</SelectItem>
              </SelectContent>
            </Select>,
          ]}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={resolvedEmptyMessage}
          illustration={illustrationForTeamEmpty(resolvedEmptyMessage)}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] text-muted-foreground font-medium">
                    Employee
                  </TableHead>
                  <TableHead className="w-[160px] text-sm font-medium text-muted-foreground">
                    Designation
                  </TableHead>
                  <TableHead className="w-[120px] text-muted-foreground font-medium">
                    <div className="flex justify-center">Status</div>
                  </TableHead>
                  <TableHead className="w-[160px] text-right text-muted-foreground font-medium">
                    Submitted
                  </TableHead>
                  <TableHead className="w-[60px] text-muted-foreground font-medium">
                    <div className="flex justify-end">{""}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => {
                  const status = memberStatus(member, deadline, reportDate);
                  const isManager = managerId === member.employeeId;

                  return (
                    <TableRow key={member.employeeId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MemberAvatar
                            userId={member.employeeId}
                            name={member.fullName}
                            avatarUrl={member.avatarUrl ?? undefined}
                            size="sm"
                          />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <div className="flex min-w-0 items-center gap-1">
                              <EmployeeNameLink
                                employeeId={member.employeeId}
                                fullName={member.fullName}
                                basePath={
                                  adminView
                                    ? "/employees"
                                    : "/manager/employees"
                                }
                              />
                              <NameIndicators
                                isManager={isManager}
                                isRemote={member.isRemote}
                                employmentType={member.employment_type}
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[160px]">
                        <span className="text-sm text-muted-foreground">
                          {member.designation ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="w-[120px]">
                        <div className="flex justify-center">
                          <SubmissionStatusBadge status={status} />
                        </div>
                      </TableCell>
                      <TableCell className="w-[160px] text-right">
                        <span className="text-sm text-muted-foreground">
                          {member.report ? (
                            <LocalTime isoString={member.report.submitted_at} />
                          ) : (
                            "—"
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="w-[60px]">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openReport(member.employeeId)}
                            disabled={!member.report}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ListGroupCard
            className="md:hidden"
            title={groupTitle}
            aside={groupAside}
          >
            {filtered.map((member) => {
              const status = memberStatus(member, deadline, reportDate);
              const isManager = managerId === member.employeeId;
              const hasReport = member.report !== null;

              return (
                <ListRow
                  key={member.employeeId}
                  leading={
                    <MemberAvatar
                      userId={member.employeeId}
                      name={member.fullName}
                      avatarUrl={member.avatarUrl ?? undefined}
                      size="sm"
                    />
                  }
                  title={member.fullName}
                  titleAddon={
                    <NameIndicators
                      isManager={isManager}
                      isRemote={member.isRemote}
                      employmentType={member.employment_type}
                    />
                  }
                  meta={[
                    member.designation,
                    member.report ? (
                      <LocalTime
                        key="time"
                        isoString={member.report.submitted_at}
                      />
                    ) : (
                      "No report"
                    ),
                  ]}
                  trailing={<SubmissionStatusBadge status={status} />}
                  onClick={
                    hasReport
                      ? () => openReport(member.employeeId)
                      : undefined
                  }
                />
              );
            })}
          </ListGroupCard>
        </>
      )}

      <ReportDetailSheet
        members={submittedMembers}
        index={openIndex}
        onIndexChange={setOpenIndex}
        deadline={deadline}
        adminView={adminView}
        templates={templates}
        viewerRole={viewerRole}
        currentUserId={currentUserId}
      />
    </div>
  );
}
