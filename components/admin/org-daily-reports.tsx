"use client";

import type { ReportComment } from "@/types/report";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSearchInput } from "@/components/shared/filter-toolbar";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import {
  ReportRoster,
  matchesRosterFilter,
  rosterFilterOptions,
  type RosterFilter,
} from "@/components/reports/report-roster";
import { cn } from "@/lib/utils";
import { isWorkingDay } from "@/lib/helpers/dates";
import { isAttendanceExempt } from "@/lib/helpers/report-stats";
import {
  getSubmissionStatus,
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


const UNASSIGNED_ID = "__unassigned__";

const STATUS_RANK: Record<SubmissionStatus, number> = {
  on_time: 0,
  late: 1,
  pending: 2,
  missed: 3,
  on_leave: 4,
  off: 5,
};

function memberStatus(
  member: TeamMemberReport,
  deadline: DeadlineContext,
  reportDate?: string,
  isOffDay?: boolean,
): SubmissionStatus {
  return getSubmissionStatus(
    member.report?.submitted_at ?? null,
    deadline.deadlineHourUtc,
    deadline,
    reportDate,
    member.isOnLeave,
    isOffDay,
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
  isOffDay?: boolean,
): OrgMemberReport[] {
  return [...members].sort((a, b) => {
    const rankA = STATUS_RANK[memberStatus(a, deadline, reportDate, isOffDay)];
    const rankB = STATUS_RANK[memberStatus(b, deadline, reportDate, isOffDay)];
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.fullName.localeCompare(b.fullName);
  });
}

export function OrgDailyReports({
  members,
  departments,
  deadline,
  templates,
  reportDate,
  viewerRole,
  currentUserId,
  comments,
  isOffDay = false,
  focusDepartmentId,
  openReportId,
}: {
  members: OrgMemberReport[];
  departments: OrgDepartment[];
  deadline: DeadlineContext;
  templates?: ReportTemplateWithFields[];
  reportDate?: string;
  viewerRole?: UserRole;
  currentUserId?: string;
  /** Comments for the listed reports, loaded with the page. */
  comments?: Record<string, ReportComment[]>;
  isOffDay?: boolean;
  focusDepartmentId?: string;
  /** Opens this report on load (links from notifications). */
  openReportId?: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RosterFilter>("all");

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
      result = result.filter((member) =>
        matchesRosterFilter(
          memberStatus(member, deadline, reportDate, isOffDay),
          statusFilter,
        ),
      );
    }

    return sortByStatusThenName(result, deadline, reportDate, isOffDay);
  }, [visibleMembers, query, statusFilter, deadline, reportDate, isOffDay]);

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
          isOffDay,
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
          isOffDay,
        ),
      });
    }

    if (focusDepartmentId) {
      return departmentSections.filter(
        (section) => section.id === focusDepartmentId,
      );
    }

    return departmentSections;
  }, [
    visibleMembers,
    departments,
    filtered,
    deadline,
    reportDate,
    isOffDay,
    focusDepartmentId,
  ]);

  const hasQuery = query.trim().length > 0;
  const options = rosterFilterOptions(
    visibleMembers.map((member) => memberStatus(member, deadline, reportDate, isOffDay)),
  );
  // Neutral until the deadline has passed; then departments still missing
  // reports turn amber.
  const deadlinePassed =
    getSubmissionStatus(null, deadline.deadlineHourUtc, deadline, reportDate) === "missed";
  const shownSections = sections.filter(
    (section) => section.visible.length > 0 || (!hasQuery && statusFilter === "all"),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FilterSearchInput value={query} onChange={setQuery} placeholder="Search people…" />
        </div>
        <SegmentedFilter
          label="Report status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={options}
        />
      </div>

      {members.length === 0 ? (
        <EmptyState title="No employees in the organization yet." />
      ) : shownSections.length === 0 ? (
        <EmptyState size="sm" title="No one matches your filters." />
      ) : (
        <ReportRoster
          sections={shownSections.map((section) => {
            const allIn = section.total > 0 && section.submitted >= section.total;
            return {
              key: section.id,
              title: section.name,
              managerId: section.managerId,
              members: section.visible,
              emptyMessage: "No employees in this department.",
              aside: (
                <span
                  className={cn(
                    allIn && "text-ok",
                    !allIn && deadlinePassed && "text-warn",
                  )}
                >
                  {allIn ? "All in" : `${section.submitted} of ${section.total} in`}
                </span>
              ),
            };
          })}
          deadline={deadline}
          reportDate={reportDate}
          isOffDay={isOffDay}
          templates={templates}
          adminView
          viewerRole={viewerRole}
          currentUserId={currentUserId}
          comments={comments}
          initialReportId={openReportId}
        />
      )}
    </div>
  );
}
