"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { EmployeeActionsMenu } from "@/components/admin/employee-actions-menu";
import { EmployeeStatusBadge } from "@/components/admin/employee-status-badge";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem, EmployeeStatus } from "@/types/employee";

type StatusFilter = "all" | Exclude<EmployeeStatus, "pending">;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All (except archived)" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited / Pending" },
  { value: "disabled", label: "Disabled" },
  { value: "archived", label: "Archived" },
];

export function EmployeeList({
  employees,
  currentUserId,
  departments,
  candidates,
}: {
  employees: EmployeeListItem[];
  currentUserId: string;
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const byStatus =
      statusFilter === "all"
        ? employees.filter((employee) => employee.status !== "archived")
        : statusFilter === "invited"
          ? employees.filter(
              (employee) =>
                employee.status === "invited" || employee.status === "pending",
            )
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
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.some(
        (employee) =>
          employee.status === "invited" || employee.status === "pending",
      ) && (
        <p className="text-xs text-muted-foreground">
          Invited — link sent and valid · Pending — link expired, regenerate needed
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {employees.length === 0
            ? "No employees yet."
            : "No employees match your filters."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/employees/${employee.id}`}
                    className="hover:underline"
                  >
                    {employee.full_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employee.email ?? "—"}
                </TableCell>
                <TableCell>{getRoleLabel(employee.role)}</TableCell>
                <TableCell>
                  {employee.department_names.join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <EmployeeStatusBadge status={employee.status} />
                </TableCell>
                <TableCell className="text-right">
                  <EmployeeActionsMenu
                    employee={employee}
                    isSelf={employee.id === currentUserId}
                    departments={departments}
                    candidates={candidates}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
