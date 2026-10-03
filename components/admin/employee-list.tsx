"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
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
import { EmployeeActionsMenu } from "@/components/admin/employee-actions-menu";
import { EmployeeStatusBadge } from "@/components/admin/employee-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FilterSearchInput,
  FilterToolbar,
  filterSelectTriggerClassName,
} from "@/components/shared/filter-toolbar";
import { ListGroupCard } from "@/components/shared/list-group-card";
import { ListRow } from "@/components/shared/list-row";
import {
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { formatDate } from "@/lib/helpers/dates";
import { RoleChip } from "@/components/shared/role-chip";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem, EmployeeStatus } from "@/types/employee";
import type { ReportTemplate } from "@/types/template";

type StatusFilter = "all" | EmployeeStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Current" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "disabled", label: "Disabled" },
  { value: "archived", label: "Archived" },
];

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

function formatTableLastSeen(
  lastSignInAt: string | null,
  lastReportDate: string | undefined,
): string {
  if (!lastSignInAt && !lastReportDate) {
    return "—";
  }
  if (lastSignInAt && !lastReportDate) {
    return formatDate(lastSignInAt.slice(0, 10));
  }
  if (!lastSignInAt && lastReportDate) {
    return formatDate(lastReportDate);
  }
  if (new Date(lastSignInAt as string) > new Date(lastReportDate as string)) {
    return formatDate((lastSignInAt as string).slice(0, 10));
  }
  return formatDate(lastReportDate as string);
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
  if (diff < 7) return `Seen ${diff}d`;
  const sameYear = seen.getFullYear() === new Date().getFullYear();
  return `Seen ${format(seen, sameYear ? "MMM d" : "MMM d, yyyy")}`;
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

  return (
    <div className="flex flex-col gap-4">
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
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        ]}
      />

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
        <>
        <ListGroupCard className="md:hidden">
          {filtered.map((employee) => {
            const resolved = resolveSource(employee, departments, templates);
            const showRole =
              employee.role === "owner" ||
              employee.role === "admin" ||
              employee.role === "manager";
            return (
              <ListRow
                key={employee.id}
                href={`/employees/${employee.id}`}
                showChevron={false}
                leading={
                  <MemberAvatar
                    userId={employee.id}
                    name={employee.full_name}
                    avatarUrl={employee.avatar_url ?? undefined}
                    size="md"
                  />
                }
                title={employee.full_name}
                titleAddon={
                  <>
                    {showRole && <RoleChip role={employee.role} />}
                    {employee.is_remote && <RemoteIndicator />}
                    {employee.employment_type === "part_time" && (
                      <PartTimeIndicator />
                    )}
                    {employee.status !== "active" && (
                      <EmployeeStatusBadge status={employee.status} />
                    )}
                  </>
                }
                meta={[
                  employee.designation,
                  formatLastSeen(
                    resolveLastSeenAt(
                      employee.last_seen_at,
                      employee.last_sign_in_at,
                      lastSeenByEmployeeId[employee.id],
                    ),
                  ),
                ]}
                trailing={
                  <EmployeeActionsMenu
                    employee={employee}
                    isSelf={employee.id === currentUserId}
                    departments={departments}
                    candidates={candidates}
                    templates={templates}
                    currentTemplateSource={resolved.source}
                    currentTemplateSourceName={resolved.sourceName}
                  />
                }
              />
            );
          })}
        </ListGroupCard>

        <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-48">Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-28">Last Seen</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((employee) => {
              const resolved = resolveSource(
                employee,
                departments,
                templates,
              );

              return (
              <TableRow key={employee.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <MemberAvatar
                      userId={employee.id}
                      name={employee.full_name}
                      avatarUrl={employee.avatar_url ?? undefined}
                      size="md"
                    />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="font-medium hover:underline"
                        >
                          {employee.full_name}
                        </Link>
                        {employee.is_remote && <RemoteIndicator />}
                        {employee.employment_type === "part_time" && (
                          <PartTimeIndicator />
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-48">
                  <span className="text-sm text-muted-foreground">
                    {employee.designation ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span>
                    {employee.department_names.join(", ") || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <RoleChip role={employee.role} />
                </TableCell>
                <TableCell className="text-center">
                  <EmployeeStatusBadge status={employee.status} />
                </TableCell>
                <TableCell className="w-28 text-sm text-muted-foreground">
                  {formatTableLastSeen(
                    employee.last_seen_at ?? employee.last_sign_in_at,
                    lastSeenByEmployeeId[employee.id],
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <EmployeeActionsMenu
                    employee={employee}
                    isSelf={employee.id === currentUserId}
                    departments={departments}
                    candidates={candidates}
                    templates={templates}
                    currentTemplateSource={resolved.source}
                    currentTemplateSourceName={resolved.sourceName}
                  />
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
        </>
      )}
    </div>
  );
}
