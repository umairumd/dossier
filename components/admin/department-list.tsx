"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSearchInput } from "@/components/shared/filter-toolbar";
import { SegmentedFilter, type SegmentedOption } from "@/components/shared/segmented-filter";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { DepartmentActionsMenu } from "@/components/admin/department-actions-menu";
import { DepartmentStatusBadge } from "@/components/admin/department-status-badge";
import { cn } from "@/lib/utils";
import type { DepartmentListItem, ManagerCandidate } from "@/types/department";

type StatusFilter = "all" | "active" | "archived";


function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

export function DepartmentList({
  departments,
  managerCandidates,
  completion,
}: {
  departments: DepartmentListItem[];
  managerCandidates: ManagerCandidate[];
  /** Today's reports by department: submitted of expected. */
  completion?: Record<string, { submitted: number; total: number }>;
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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((department) => {
            const today = completion?.[department.id];
            const members = department.members ?? [];
            const faces = members.slice(0, 4);
            const empty = department.employee_count === 0;
            const pct = today && today.total > 0 ? Math.round((today.submitted / today.total) * 100) : 0;
            return (
              <li
                key={department.id}
                className={cn(
                  "surface-card group relative flex flex-col gap-4 rounded-xl bg-card p-5 transition-colors hover:bg-fill-subtle",
                  department.archived_at && "opacity-70",
                )}
              >
                <Link
                  href={`/departments/${department.id}`}
                  aria-label={`Open ${department.name}`}
                  className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium">{department.name}</span>
                      {department.archived_at && <DepartmentStatusBadge archivedAt={department.archived_at} />}
                    </span>
                    {empty ? (
                      <span className="text-[13px] text-warn">No members yet</span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">{peopleLabel(department.employee_count)}</span>
                    )}
                  </div>
                  <span className="relative z-10 -mt-1 -mr-2">
                    <DepartmentActionsMenu department={department} managerCandidates={managerCandidates} />
                  </span>
                </div>

                {empty ? (
                  <p className="text-[13px] text-muted-foreground">Add people from the department page.</p>
                ) : (
                  <div className="flex items-center">
                    {faces.map((member, index) => (
                      <MemberAvatar
                        key={member.id}
                        userId={member.id}
                        name={member.name}
                        avatar={member.avatar}
                        size="sm"
                        className={index > 0 ? "-ml-1.5" : undefined}
                      />
                    ))}
                    {members.length > faces.length ? (
                      <span className="-ml-1.5 flex size-7 items-center justify-center rounded-full bg-fill-active text-[11px] font-medium text-muted-foreground tabular-nums">
                        +{members.length - faces.length}
                      </span>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-muted-foreground">Reported today</span>
                    <span className="tabular-nums">
                      {today && today.total > 0 ? `${today.submitted} of ${today.total}` : "None expected"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-fill-active">
                    <div
                      className={cn("h-full rounded-full", pct === 100 ? "bg-ok" : "bg-foreground/50")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 border-t border-line pt-3 text-[13px]">
                  {department.manager_name ? (
                    <>
                      <MemberAvatar
                        userId={department.manager_id ?? undefined}
                        name={department.manager_name}
                        avatar={department.manager_avatar}
                        size="xs"
                      />
                      <span className="truncate">{department.manager_name}</span>
                      <span className="text-muted-foreground">· Manager</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No manager</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
