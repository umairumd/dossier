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
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { DepartmentActionsMenu } from "@/components/admin/department-actions-menu";
import { DepartmentStatusBadge } from "@/components/admin/department-status-badge";
import type { DepartmentListItem, ManagerCandidate } from "@/types/department";

type StatusFilter = "all" | "active" | "archived";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search departments..."
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

      {filtered.length === 0 ? (
        <EmptyState
          title={
            departments.length === 0
              ? "No departments yet."
              : "No departments match your filters."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((department) => (
              <TableRow key={department.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/departments/${department.id}`}
                      className="font-medium hover:underline"
                    >
                      {department.name}
                    </Link>
                    {department.employee_count === 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-yellow-500/50 text-yellow-500/80"
                      >
                        No members
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {department.manager_name ? (
                    <div className="flex items-center gap-2">
                      <MemberAvatar
                        name={department.manager_name}
                        size="xs"
                      />
                      <span>{department.manager_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>{department.employee_count}</TableCell>
                <TableCell>
                  <DepartmentStatusBadge archivedAt={department.archived_at} />
                </TableCell>
                <TableCell className="text-right">
                  <DepartmentActionsMenu
                    department={department}
                    managerCandidates={managerCandidates}
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
