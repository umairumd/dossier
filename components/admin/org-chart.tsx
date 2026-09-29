"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { cn } from "@/lib/utils";
import type { OrgNode } from "@/lib/helpers/org-tree";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem } from "@/types/employee";

function EmployeeRow({
  employee,
  isManager = false,
}: {
  employee: EmployeeListItem;
  isManager?: boolean;
}) {
  return (
    <Link
      href={`/employees/${employee.id}`}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-foreground/5"
    >
      <MemberAvatar
        userId={employee.id}
        name={employee.full_name}
        size="sm"
        className="shrink-0"
      />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="truncate text-sm font-medium text-foreground">
          {employee.full_name}
        </p>
        {employee.designation && (
          <>
            <span className="shrink-0 text-xs text-muted-foreground">·</span>
            <p className="truncate text-xs text-muted-foreground">
              {employee.designation}
            </p>
          </>
        )}
        {isManager && (
          <Crown className="size-3.5 shrink-0 text-primary/60" />
        )}
        {employee.is_remote && <RemoteIndicator />}
        {employee.employment_type === "part_time" && <PartTimeIndicator />}
      </div>
    </Link>
  );
}

function DeptCard({
  title,
  members,
  managerId,
  dashed = false,
  className,
}: {
  title: string;
  members: EmployeeListItem[];
  managerId?: string | null;
  dashed?: boolean;
  className?: string;
}) {
  // Only highlight when manager_id is set and matches a member in this card.
  // Null manager_id → all regular rows, no crown.
  const manager =
    managerId != null
      ? members.find((m) => m.id === managerId)
      : undefined;
  const rest = members
    .filter((m) => m.id !== manager?.id)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border bg-card",
        dashed ? "border-dashed border-border" : "border-border",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="label-eyebrow">{title}</span>
        <span className="text-xs text-muted-foreground">
          ({members.length})
        </span>
      </div>
      <div className="flex flex-col">
        {manager && <EmployeeRow employee={manager} isManager />}
        {rest.map((member) => (
          <EmployeeRow key={member.id} employee={member} />
        ))}
      </div>
    </div>
  );
}

export function OrgChart({
  employees,
  departments,
}: {
  roots: OrgNode[];
  unsupervised: OrgNode[];
  employees: EmployeeListItem[];
  departments: DepartmentOption[];
}) {
  const active = employees.filter((e) => e.status === "active");

  if (active.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No active employees to display.
      </div>
    );
  }

  const leadership = active
    .filter((e) => e.role === "owner" || e.role === "admin")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const leadershipIds = new Set(leadership.map((e) => e.id));

  const nonLeadership = active.filter((e) => !leadershipIds.has(e.id));

  const deptCards = departments
    .map((dept) => {
      const members = nonLeadership.filter((e) =>
        e.department_ids.includes(dept.id),
      );
      return {
        id: dept.id,
        name: dept.name,
        managerId: dept.manager_id ?? null,
        members,
      };
    })
    .filter((card) => card.members.length > 0)
    .sort(
      (a, b) =>
        b.members.length - a.members.length ||
        a.name.localeCompare(b.name),
    );

  const assignedIds = new Set(
    deptCards.flatMap((c) => c.members.map((m) => m.id)),
  );
  const unassigned = nonLeadership
    .filter(
      (e) => e.department_ids.length === 0 && !assignedIds.has(e.id),
    )
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <div className="flex w-full flex-col gap-4">
      {leadership.length > 0 && (
        <DeptCard title="Leadership" members={leadership} />
      )}

      {deptCards.length > 0 && (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {deptCards.map((card) => (
            <DeptCard
              key={card.id}
              title={card.name}
              members={card.members}
              managerId={card.managerId}
              className="h-full"
            />
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <DeptCard title="Unassigned" members={unassigned} dashed />
      )}
    </div>
  );
}
