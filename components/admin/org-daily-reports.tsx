"use client";

import { useMemo, useState } from "react";
import { TeamReportsView } from "@/components/manager/team-reports-view";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FilterSearchInput,
  FilterToolbar,
  filterSelectTriggerClassName,
} from "@/components/shared/filter-toolbar";
import { cn } from "@/lib/utils";
import { isWorkingDay } from "@/lib/helpers/dates";
import { isAttendanceExempt } from "@/lib/helpers/report-stats";
import {
  getSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type DeadlineContext,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";
import type {
  OrgDepartment,
  OrgMemberReport,
} from "@/lib/supabase/queries/admin/org-reports";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";
import type { TeamMemberReport } from "@/types/team";

type StatusFilter = "all" | SubmissionStatus;

const UNASSIGNED_ID = "__unassigned__";

const STATUS_RANK: Record<SubmissionStatus, number> = {
  on_time: 0,
  late: 1,
  pending: 2,
  missed: 3,
  on_leave: 4,
  holiday: 5,
};

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
    member.attendanceStatus,
  );
}

function isVisibleOnReportDate(
  member: TeamMemberReport,
  reportDate: string | undefined,
  workingDays: number[],
): boolean {
  const hasReport = member.report != null;
  const isOrgOffDay =
    Boolean(reportDate) &&
    workingDays.length > 0 &&
    !isWorkingDay(reportDate!, workingDays);
  if (isOrgOffDay && !hasReport) {
    return false;
  }
  return true;
}

function isCountableForSubmission(member: TeamMemberReport): boolean {
  const hasReport = member.report != null;
  return !(isAttendanceExempt(member.attendanceStatus) && !hasReport);
}

function submissionCounts(
  members: TeamMemberReport[],
  reportDate: string | undefined,
  workingDays: number[],
): { submitted: number; total: number; completionPct: number } {
  const isOrgOffDay =
    Boolean(reportDate) &&
    workingDays.length > 0 &&
    !isWorkingDay(reportDate!, workingDays);

  if (isOrgOffDay) {
    const submitters = members.filter((member) => member.report != null);
    const total = submitters.length;
    return {
      submitted: total,
      total,
      completionPct: total === 0 ? 0 : 100,
    };
  }

  const countable = members.filter(isCountableForSubmission);
  const submitted = countable.filter((member) => member.report != null).length;
  const total = countable.length;
  return {
    submitted,
    total,
    completionPct: total === 0 ? 0 : Math.round((submitted / total) * 100),
  };
}

function sortByStatusThenName(
  members: OrgMemberReport[],
  deadline: DeadlineContext,
  reportDate?: string,
): OrgMemberReport[] {
  return [...members].sort((a, b) => {
    const rankA = STATUS_RANK[memberStatus(a, deadline, reportDate)];
    const rankB = STATUS_RANK[memberStatus(b, deadline, reportDate)];
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.fullName.localeCompare(b.fullName);
  });
}

function completionClass(pct: number): string {
  if (pct >= 80) {
    return "text-primary";
  }
  if (pct >= 50) {
    // One-off: shadcn has no semantic warning token; yellow is not a theme variable.
    return "text-yellow-500/70";
  }
  return "text-destructive";
}

export function OrgDailyReports({
  members,
  departments,
  deadline,
  templates,
  reportDate,
  viewerRole,
  currentUserId,
}: {
  members: OrgMemberReport[];
  departments: OrgDepartment[];
  deadline: DeadlineContext;
  templates?: ReportTemplateWithFields[];
  reportDate?: string;
  viewerRole?: UserRole;
  currentUserId?: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const visibleMembers = useMemo(
    () =>
      members.filter((member) =>
        isVisibleOnReportDate(member, reportDate, deadline.workingDays),
      ),
    [members, reportDate, deadline.workingDays],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let result = visibleMembers;

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

    return sortByStatusThenName(result, deadline, reportDate);
  }, [visibleMembers, query, statusFilter, deadline, reportDate]);

  const sections = useMemo(() => {
    const byDepartment = new Map<string, OrgMemberReport[]>();

    for (const member of visibleMembers) {
      if (member.departmentIds.length === 0) {
        const group = byDepartment.get(UNASSIGNED_ID) ?? [];
        group.push(member);
        byDepartment.set(UNASSIGNED_ID, group);
        continue;
      }

      for (const departmentId of member.departmentIds) {
        const group = byDepartment.get(departmentId) ?? [];
        group.push(member);
        byDepartment.set(departmentId, group);
      }
    }

    const departmentSections = departments
      .map((department) => {
        const all = byDepartment.get(department.id) ?? [];
        const { submitted, total, completionPct } = submissionCounts(
          all,
          reportDate,
          deadline.workingDays,
        );
        const visibleIds = new Set(
          filtered
            .filter((member) => member.departmentIds.includes(department.id))
            .map((member) => member.employeeId),
        );
        const visible = sortByStatusThenName(
          all.filter((member) => visibleIds.has(member.employeeId)),
          deadline,
          reportDate,
        );

        return {
          id: department.id,
          name: department.name,
          managerId: department.managerId ?? undefined,
          total,
          submitted,
          completionPct,
          visible,
        };
      })
      .filter((section) => section.total > 0 || section.visible.length > 0)
      .sort((a, b) => a.completionPct - b.completionPct);

    const unassignedAll = byDepartment.get(UNASSIGNED_ID) ?? [];
    if (unassignedAll.length > 0) {
      const { submitted, total, completionPct } = submissionCounts(
        unassignedAll,
        reportDate,
        deadline.workingDays,
      );
      const visibleIds = new Set(
        filtered
          .filter((member) => member.departmentIds.length === 0)
          .map((member) => member.employeeId),
      );
      departmentSections.push({
        id: UNASSIGNED_ID,
        name: "No Department Assigned",
        managerId: undefined,
        total,
        submitted,
        completionPct,
        visible: sortByStatusThenName(
          unassignedAll.filter((member) => visibleIds.has(member.employeeId)),
          deadline,
          reportDate,
        ),
      });
    }

    return departmentSections;
  }, [visibleMembers, departments, filtered, deadline, reportDate]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      <FilterToolbar
        search={
          <FilterSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search employees..."
          />
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
              <SelectItem value="holiday">{SUBMISSION_STATUS_LABELS.holiday}</SelectItem>
            </SelectContent>
          </Select>,
        ]}
      />

      {members.length === 0 && (
        <EmptyState title="No employees in the organization yet." />
      )}

      {sections.map((section) => {
        const emptyMessage = hasQuery
          ? "No matching people."
          : statusFilter !== "all"
            ? "Everyone submitted today."
            : "No employees in this department.";

        const sectionTitle =
          section.id === UNASSIGNED_ID
            ? section.name
            : `${section.name} Department`;
        const submittedAside = (
          <span
            className={cn(
              "shrink-0 text-sm font-medium",
              completionClass(section.completionPct),
            )}
          >
            {section.submitted}/{section.total} submitted
          </span>
        );

        return (
          <Card
            key={section.id}
            className="card-gradient max-md:gap-0 max-md:bg-transparent max-md:bg-none max-md:py-0 max-md:ring-0 max-md:shadow-none"
          >
            <CardHeader className="hidden pb-3 md:block">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="min-w-0 truncate text-base">
                  {sectionTitle}
                </CardTitle>
                {submittedAside}
              </div>
            </CardHeader>
            <CardContent className="p-0 max-md:px-0">
              <TeamReportsView
                members={section.visible}
                deadline={deadline}
                adminView
                showFilters={false}
                emptyMessage={emptyMessage}
                managerId={section.managerId}
                templates={templates}
                reportDate={reportDate}
                viewerRole={viewerRole}
                currentUserId={currentUserId}
                groupTitle={sectionTitle}
                groupAside={submittedAside}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
