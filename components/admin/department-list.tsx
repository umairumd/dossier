"use client";

import { useMemo, useState } from "react";
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
import { ArchiveDepartmentButton } from "@/components/admin/archive-department-button";
import { DepartmentStatusBadge } from "@/components/admin/department-status-badge";
import { EditDepartmentSheet } from "@/components/admin/edit-department-sheet";
import type { DepartmentListItem, ManagerCandidate } from "@/types/department";

type StatusFilter = "active" | "archived";

export function DepartmentList({
  departments,
  managerCandidates,
}: {
  departments: DepartmentListItem[];
  managerCandidates: ManagerCandidate[];
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const filtered = useMemo(
    () =>
      departments.filter((department) =>
        statusFilter === "archived"
          ? department.archived_at
          : !department.archived_at,
      ),
    [departments, statusFilter],
  );

  return (
    <div className="flex flex-col gap-4">
      <Select
        value={statusFilter}
        onValueChange={(value) => setStatusFilter(value as StatusFilter)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {statusFilter === "archived"
            ? "No archived departments."
            : "No departments yet."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((department) => (
              <TableRow key={department.id}>
                <TableCell className="font-medium">
                  {department.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {department.manager_name ?? "Unassigned"}
                </TableCell>
                <TableCell>{department.employee_count}</TableCell>
                <TableCell>
                  <DepartmentStatusBadge archivedAt={department.archived_at} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <EditDepartmentSheet
                      department={department}
                      managerCandidates={managerCandidates}
                    />
                    <ArchiveDepartmentButton
                      departmentId={department.id}
                      name={department.name}
                      isArchived={!!department.archived_at}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
