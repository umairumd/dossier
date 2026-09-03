"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TeamReportsView } from "@/components/manager/team-reports-view";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  getSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";
import type {
  OrgDepartment,
  OrgMemberReport,
} from "@/lib/supabase/queries/admin/org-reports";

type StatusFilter = "all" | SubmissionStatus;

const UNASSIGNED_ID = "__unassigned__";

const STATUS_RANK: Record<SubmissionStatus, number> = {
  on_time: 0,
  late: 1,
  missed: 2,
};

function sortByStatusThenName(
  members: OrgMemberReport[],
  deadlineHourUtc: number,
): OrgMemberReport[] {
  return [...members].sort((a, b) => {
    const rankA = STATUS_RANK[getSubmissionStatus(a.report?.submitted_at ?? null, deadlineHourUtc)];
    const rankB = STATUS_RANK[getSubmissionStatus(b.report?.submitted_at ?? null, deadlineHourUtc)];
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
  deadlineHourUtc,
}: {
  members: OrgMemberReport[];
  departments: OrgDepartment[];
  deadlineHourUtc: number;
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
            deadlineHourUtc,
          ) === statusFilter,
      );
    }

    return sortByStatusThenName(result, deadlineHourUtc);
  }, [members, query, statusFilter, deadlineHourUtc]);

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
          deadlineHourUtc,
        );

        return {
          id: department.id,
          name: department.name,
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
        total,
        submitted,
        completionPct: total === 0 ? 0 : Math.round((submitted / total) * 100),
        visible: sortByStatusThenName(
          unassignedAll.filter((member) => visibleIds.has(member.employeeId)),
          deadlineHourUtc,
        ),
      });
    }

    return departmentSections;
  }, [members, departments, filtered, deadlineHourUtc]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
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

      {members.length === 0 && (
        <EmptyState title="No employees in the organization yet." />
      )}

      {sections.map((section, index) => {
        const emptyMessage = hasQuery
          ? "No matching people."
          : statusFilter !== "all"
            ? "Everyone submitted today."
            : "No employees in this department.";

        return (
          <div key={section.id}>
            {index > 0 && <Separator className="mb-6" />}
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {section.name}
              </h2>
              <span
                className={cn(
                  "text-sm font-medium",
                  completionClass(section.completionPct),
                )}
              >
                {section.submitted}/{section.total} submitted
              </span>
            </div>
            {section.visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : (
              <TeamReportsView
                members={section.visible}
                departmentName={section.name}
                deadlineHourUtc={deadlineHourUtc}
                adminView
                showFilters={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
