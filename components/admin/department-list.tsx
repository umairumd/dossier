"use client";

import { useMemo, useState } from "react";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSearchInput } from "@/components/shared/filter-toolbar";
import { SegmentedFilter, type SegmentedOption } from "@/components/shared/segmented-filter";
import { NoMembersIndicator } from "@/components/shared/employee-indicators";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { DepartmentActionsMenu } from "@/components/admin/department-actions-menu";
import { DepartmentStatusBadge } from "@/components/admin/department-status-badge";
import type { DepartmentListItem, ManagerCandidate } from "@/types/department";

type StatusFilter = "all" | "active" | "archived";

const COLUMNS = "minmax(0,1fr) minmax(0,1fr) 6rem 2rem";

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

export function DepartmentList({
  departments,
  managerCandidates,
}: {
  departments: DepartmentListItem[];
  managerCandidates: ManagerCandidate[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const filtered = useMemo(() => {
    const byStatus =
      statusFilter === "all"
        ? departments
        : statusFilter === "archived"
          ? departments.filter((d) => d.archived_at)
          : departments.filter((d) => !d.archived_at);

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return byStatus;
    }

    return byStatus.filter(
      (department) =>
        department.name.toLowerCase().includes(normalized) ||
        department.manager_name?.toLowerCase().includes(normalized)
    );
  }, [departments, query, statusFilter]);

  const archivedCount = departments.filter((department) => department.archived_at).length;
  const options: SegmentedOption<StatusFilter>[] = [
    { value: "active", label: "Active", count: departments.length - archivedCount },
    ...(archivedCount > 0
      ? [{ value: "archived" as const, label: "Archived", count: archivedCount }]
      : []),
    { value: "all", label: "All", count: departments.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FilterSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search departments…"
          />
        </div>
        <SegmentedFilter
          label="Department status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={options}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration="departments"
          title={
            departments.length === 0
              ? "No departments yet."
              : "No departments match your filters."
          }
        />
      ) : (
        <DataList columns={COLUMNS} header={["Department", "Manager", "People", ""]}>
          {filtered.map((department) => (
            <DataListRow
              key={department.id}
              href={`/departments/${department.id}`}
              label={`Open ${department.name}`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{department.name}</span>
                  {department.employee_count === 0 && <NoMembersIndicator />}
                  {department.archived_at && (
                    <DepartmentStatusBadge archivedAt={department.archived_at} />
                  )}
                </span>
                <span className="truncate text-[13px] text-muted-foreground md:hidden">
                  {department.manager_name ?? "No manager"} ·{" "}
                  {peopleLabel(department.employee_count)}
                </span>
              </span>
              <span className="hidden min-w-0 items-center gap-2.5 md:flex">
                {department.manager_name ? (
                  <>
                    <MemberAvatar
                      userId={department.manager_id ?? undefined}
                      name={department.manager_name}
                      avatar={department.manager_avatar}
                      size="sm"
                    />
                    <span className="truncate text-[13.5px] text-foreground/80">
                      {department.manager_name}
                    </span>
                  </>
                ) : (
                  <span className="text-[13.5px] text-muted-foreground">No manager</span>
                )}
              </span>
              <span className="hidden text-[13px] tabular-nums text-muted-foreground md:block">
                {peopleLabel(department.employee_count)}
              </span>
              <span className="relative z-10 flex justify-end">
                <DepartmentActionsMenu
                  department={department}
                  managerCandidates={managerCandidates}
                />
              </span>
            </DataListRow>
          ))}
        </DataList>
      )}
    </div>
  );
}
