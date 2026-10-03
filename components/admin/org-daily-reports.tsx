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

type StatusFilter = "all" | SubmissionStatus;

const UNASSIGNED_ID = "__unassigned__";

const STATUS_RANK: Record<SubmissionStatus, number> = {
  on_time: 0,
  late: 1,
  pending: 2,
  missed: 3,
  on_leave: 4,
};

function sortByStatusThenName(
  members: OrgMemberReport[],
  deadline: DeadlineContext,
  reportDate?: string,
): OrgMemberReport[] {
  return [...members].sort((a, b) => {
    const rankA = STATUS_RANK[getSubmissionStatus(a.report?.submitted_at ?? null, deadline.deadlineHourUtc, deadline, reportDate, a.isOnLeave)];
    const rankB = STATUS_RANK[getSubmissionStatus(b.report?.submitted_at ?? null, deadline.deadlineHourUtc, deadline, reportDate, b.isOnLeave)];
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

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let result = members;

    if (normalized) {
      result = result.filter((member) =>
        member.fullName.toLowerCase().includes(normalized),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (member) =>
          getSubmissionStatus(
            member.report?.submitted_at ?? null,
            deadline.deadlineHourUtc,
            deadline,
            reportDate,
            member.isOnLeave,
          ) === statusFilter,
      );
    }

    return sortByStatusThenName(result, deadline, reportDate);
  }, [members, query, statusFilter, deadline, reportDate]);

  const sections = useMemo(() => {
    const byDepartment = new Map<string, OrgMemberReport[]>();

    for (const member of members) {
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
        const total = all.length;
        const submitted = all.filter((member) => member.report).length;
        const completionPct =
          total === 0 ? 0 : Math.round((submitted / total) * 100);
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
      .filter((section) => section.total > 0)
      .sort((a, b) => a.completionPct - b.completionPct);

    const unassignedAll = byDepartment.get(UNASSIGNED_ID) ?? [];
    if (unassignedAll.length > 0) {
      const total = unassignedAll.length;
      const submitted = unassignedAll.filter((member) => member.report).length;
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
        completionPct: total === 0 ? 0 : Math.round((submitted / total) * 100),
        visible: sortByStatusThenName(
          unassignedAll.filter((member) => visibleIds.has(member.employeeId)),
          deadline,
          reportDate,
        ),
      });
    }

    return departmentSections;
  }, [members, departments, filtered, deadline]);

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
