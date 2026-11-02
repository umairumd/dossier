"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { PartTimeIndicator, RemoteIndicator } from "@/components/shared/employee-indicators";
import { cn } from "@/lib/utils";
import type { OrgNode } from "@/lib/helpers/org-tree";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem } from "@/types/employee";

// The org chart as a tree: leadership on top, one branch per department.
// In a department the manager comes first, then members on a rail; people
// someone supervises hang under that person and can be folded away.
// Wide screens draw the departments side by side with connecting lines;
// phones stack them, keeping the rails.

const byName = (a: EmployeeListItem, b: EmployeeListItem) => a.full_name.localeCompare(b.full_name);

function PersonCard({
  person,
  tone = "plain",
  badge,
  trailing,
}: {
  person: EmployeeListItem;
  tone?: "plain" | "lead" | "manager";
  badge?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-2.5 rounded-xl bg-card px-3 py-2 ring-1 ring-inset transition-colors hover:bg-fill-hover",
        tone === "lead" ? "ring-info/35" : tone === "manager" ? "ring-foreground/20" : "ring-edge",
      )}
    >
      <Link
        href={`/employees/${person.id}`}
        aria-label={`Open ${person.full_name}`}
        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      />
      <MemberAvatar userId={person.id} name={person.full_name} avatar={person.avatar} size="sm" className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-medium" title={person.full_name}>
            {person.full_name}
          </span>
          {person.is_remote ? <RemoteIndicator /> : null}
          {person.employment_type === "part_time" ? <PartTimeIndicator /> : null}
        </span>
        {person.designation ? (
          <span className="truncate text-[11.5px] text-muted-foreground">{person.designation}</span>
        ) : null}
      </div>
      {badge ? (
        <span className="shrink-0 rounded-md bg-info/12 px-1.5 py-0.5 text-[10.5px] text-info">{badge}</span>
      ) : null}
      {trailing}
    </div>
  );
}

/** One member and, folded under them, the people they supervise. */
function Branch({
  person,
  childrenOf,
}: {
  person: EmployeeListItem;
  childrenOf: Map<string, EmployeeListItem[]>;
}) {
  const kids = childrenOf.get(person.id) ?? [];
  const [open, setOpen] = useState(true);
  return (
    <li className="relative flex flex-col gap-1.5 before:absolute before:top-5 before:-left-3 before:h-px before:w-3 before:bg-line">
      <PersonCard
        person={person}
        trailing={
          kids.length ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? `Fold ${person.full_name}'s team` : `Show ${person.full_name}'s team`}
              className="relative z-10 -mr-1 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] text-muted-foreground tabular-nums hover:bg-fill-active hover:text-foreground"
            >
              {kids.length}
              {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </button>
          ) : null
        }
      />
      {kids.length && open ? (
        <ul className="ml-4 flex flex-col gap-1.5 border-l border-dashed border-line pl-3">
          {kids.map((kid) => (
            <Branch key={kid.id} person={kid} childrenOf={childrenOf} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function DepartmentBranch({
  name,
  manager,
  members,
}: {
  name: string;
  manager: EmployeeListItem | null;
  members: EmployeeListItem[];
}) {
  // Nest people under a supervisor who is in the same branch (and isn't the
  // manager, who already heads it).
  const inBranch = new Set(members.map((member) => member.id));
  const parentOf = (member: EmployeeListItem) =>
    member.supervisor_ids.find((id) => inBranch.has(id) && id !== member.id && id !== manager?.id) ?? null;
  const childrenOf = new Map<string, EmployeeListItem[]>();
  const top: EmployeeListItem[] = [];
  for (const member of [...members].sort(byName)) {
    const parent = parentOf(member);
    // Guard against two people supervising each other: keep both on top.
    const parentMember = parent ? members.find((m) => m.id === parent) : null;
    if (parent && parentMember && parentOf(parentMember) !== member.id) {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), member]);
    } else {
      top.push(member);
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-2">
      <span className="self-center rounded-full bg-fill-subtle px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-edge">
        {name}
      </span>
      {manager ? (
        // The manager heads the branch: first, with a brighter outline and
        // "Manager" read out to screen readers.
        <div aria-label={`Manager: ${manager.full_name}`}>
          <PersonCard person={manager} tone="manager" />
        </div>
      ) : (
        <div className="rounded-xl px-3 py-2 text-[12.5px] text-muted-foreground ring-1 ring-edge ring-inset [border-style:dashed]">
          No manager yet
        </div>
      )}
      {top.length ? (
        <ul className="ml-3 flex flex-col gap-1.5 border-l border-line pl-3">
          {top.map((member) => (
            <Branch key={member.id} person={member} childrenOf={childrenOf} />
          ))}
        </ul>
      ) : null}
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
    return <EmptyState illustration="employees" title="No active employees to display." />;
  }

  const leadership = active.filter((e) => e.role === "owner" || e.role === "admin").sort(byName);
  const leadershipIds = new Set(leadership.map((e) => e.id));
  const byId = new Map(active.map((e) => [e.id, e]));

  const branches = departments
    .map((dept) => {
      const manager = dept.manager_id ? (byId.get(dept.manager_id) ?? null) : null;
      // Leadership sits on top, so leaders only appear in a branch as its
      // manager.
      const members = active.filter(
        (e) => e.department_ids.includes(dept.id) && !leadershipIds.has(e.id) && e.id !== manager?.id,
      );
      return { id: dept.id, name: dept.name, manager, members };
    })
    .filter((branch) => branch.members.length > 0 || branch.manager)
    .sort((a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name));

  const placed = new Set(branches.flatMap((b) => [...b.members.map((m) => m.id), b.manager?.id ?? ""]));
  const unassigned = active
    .filter((e) => !leadershipIds.has(e.id) && !placed.has(e.id) && e.department_ids.length === 0)
    .sort(byName);

  return (
    <div className="surface-card overflow-x-auto rounded-xl bg-card/40 p-5 md:p-7">
      <div className="flex w-full flex-col items-center lg:min-w-max xl:min-w-0">
        {leadership.length ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">Leadership</span>
            <div className="flex flex-wrap justify-center gap-2.5">
              {leadership.map((person) => (
                <div key={person.id} className="w-56 max-sm:w-full">
                  <PersonCard person={person} tone="lead" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {branches.length ? (
          <>
            {leadership.length ? <div className="h-6 w-px bg-line max-lg:hidden" aria-hidden /> : null}
            {/* Each branch draws its own piece of the horizontal line, so the
                line spans first to last branch without measuring anything. */}
            <div className="flex w-full flex-col gap-8 max-lg:mt-6 lg:flex-row lg:gap-0">
              {branches.map((branch, index) => (
                <div
                  key={branch.id}
                  className={cn(
                    // Branches share the width; below about 11rem each the
                    // chart scrolls sideways instead of squeezing.
                    "relative lg:min-w-44 lg:flex-1 lg:px-1.5 lg:pt-6",
                    "lg:before:absolute lg:before:top-0 lg:before:h-px lg:before:bg-line",
                    index === 0 ? "lg:before:left-1/2" : "lg:before:left-0",
                    index === branches.length - 1 ? "lg:before:right-1/2" : "lg:before:right-0",
                    "lg:after:absolute lg:after:top-0 lg:after:left-1/2 lg:after:h-6 lg:after:w-px lg:after:bg-line",
                  )}
                >
                  <DepartmentBranch name={branch.name} manager={branch.manager} members={branch.members} />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {unassigned.length ? (
          <div className="mt-8 flex w-full flex-col gap-2 border-t border-line pt-5">
            <span className="text-[11px] font-medium text-muted-foreground">Not in a department</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {unassigned.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
