"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { EmployeeActionsMenu } from "@/components/admin/employee-actions-menu";
import { EmployeeStatusBadge } from "@/components/admin/employee-status-badge";
import { DataList, DataListRow, PersonCell } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSearchInput } from "@/components/shared/filter-toolbar";
import { SegmentedFilter, type SegmentedOption } from "@/components/shared/segmented-filter";
import {
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem, EmployeeStatus } from "@/types/employee";
import type { ReportTemplate } from "@/types/template";

type StatusFilter = "all" | EmployeeStatus;

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
};

const COLUMNS = "minmax(0,1.3fr) minmax(0,1fr) 5.5rem 6.5rem 2rem";

function resolveSource(
  employee: EmployeeListItem,
  departments: DepartmentOption[],
  templates: ReportTemplate[],
): {
  source: "individual" | "department" | "default";
  sourceName: string | null;
} {
  if (employee.template_id) {
    return { source: "individual", sourceName: null };
  }

  const departmentById = new Map(
    departments.map((department) => [department.id, department]),
  );

  for (const departmentId of employee.department_ids) {
    const department = departmentById.get(departmentId);
    if (department?.template_id) {
      return {
        source: "department",
        sourceName: department.name,
      };
    }
  }

  void templates;
  return { source: "default", sourceName: null };
}

function resolveLastSeenAt(
  lastSeenAt: string | null,
  lastSignInAt: string | null,
  lastReportDate: string | undefined,
): string | null {
  const activity = lastSeenAt ?? lastSignInAt;
  if (!activity) return lastReportDate ?? null;
  if (!lastReportDate) return activity;
  return new Date(activity) > new Date(lastReportDate)
    ? activity
    : lastReportDate;
}

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "Never";
  const seen = new Date(lastSeenAt);
  const diff = differenceInCalendarDays(new Date(), seen);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  const sameYear = seen.getFullYear() === new Date().getFullYear();
  return format(seen, sameYear ? "MMM d" : "MMM d, yyyy");
}

export function EmployeeList({
  employees,
  currentUserId,
  departments,
  candidates,
  lastSeenByEmployeeId,
  templates,
}: {
  employees: EmployeeListItem[];
  currentUserId: string;
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
  lastSeenByEmployeeId: Record<string, string>;
  templates: ReportTemplate[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const byStatus =
      statusFilter === "all"
        ? employees.filter((employee) => employee.status !== "archived")
        : employees.filter((employee) => employee.status === statusFilter);

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return byStatus;
    }

    return byStatus.filter(
      (employee) =>
        employee.full_name.toLowerCase().includes(normalized) ||
        employee.email?.toLowerCase().includes(normalized)
    );
  }, [employees, query, statusFilter]);

  const countOf = (filter: StatusFilter) =>
    filter === "all"
      ? employees.filter((employee) => employee.status !== "archived").length
      : employees.filter((employee) => employee.status === filter).length;
  const options: SegmentedOption<StatusFilter>[] = (
    [
      ["all", "Current"],
      ["active", "Active"],
      ["invited", "Invited"],
      ["disabled", "Deactivated"],
      ["archived", "Archived"],
    ] as const
  )
    .map(([value, label]) => ({ value, label, count: countOf(value) }))
    .filter((option) => option.value === "all" || option.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FilterSearchInput value={query} onChange={setQuery} placeholder="Search people…" />
        </div>
        <SegmentedFilter
          label="Employee status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={options}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration="employees"
          title={
            employees.length === 0
              ? "No employees yet."
              : "No employees match your filters."
          }
        />
      ) : (
        <DataList
          columns={COLUMNS}
          header={["Person", "Department", "Role", "Last seen", ""]}
        >
          {filtered.map((employee) => {
            const resolved = resolveSource(employee, departments, templates);
            const seen = formatLastSeen(
              resolveLastSeenAt(
                employee.last_seen_at,
                employee.last_sign_in_at,
                lastSeenByEmployeeId[employee.id],
              ),
            );
            return (
              <DataListRow
                key={employee.id}
                href={`/employees/${employee.id}`}
                label={`Open ${employee.full_name}`}
              >
                <PersonCell
                  id={employee.id}
                  name={employee.full_name}
                  avatar={employee.avatar}
                  addon={
                    <>
                      {employee.is_remote && <RemoteIndicator />}
                      {employee.employment_type === "part_time" && <PartTimeIndicator />}
                      {employee.status !== "active" && (
                        <EmployeeStatusBadge status={employee.status} />
                      )}
                    </>
                  }
                  detail={
                    <>
                      {employee.designation ?? "—"}
                      <span className="md:hidden"> · {seen}</span>
                    </>
                  }
                />
                <span className="hidden truncate text-[13.5px] text-foreground/80 md:block">
                  {employee.department_names.join(", ") || "—"}
                </span>
                <span className="hidden text-[13px] text-foreground/80 md:block">
                  {ROLE_LABEL[employee.role] ?? employee.role}
                </span>
                <span className="hidden text-[13px] text-muted-foreground md:block">
                  {seen}
                </span>
                <span className="relative z-10 flex justify-end">
                  <EmployeeActionsMenu
                    employee={employee}
                    isSelf={employee.id === currentUserId}
                    departments={departments}
                    candidates={candidates}
                    templates={templates}
                    currentTemplateSource={resolved.source}
                    currentTemplateSourceName={resolved.sourceName}
                  />
                </span>
              </DataListRow>
            );
          })}
        </DataList>
      )}
    </div>
  );
}
