"use client";

import Link from "next/link";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { cn } from "@/lib/utils";
import type { OrgNode } from "@/lib/helpers/org-tree";

// A single person row — no children rendering here
function PersonRow({
  node,
  className,
}: {
  node: OrgNode;
  className?: string;
}) {
  return (
    <Link
      href={`/employees/${node.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2",
        "hover:bg-foreground/5 transition-colors group",
        className,
      )}
    >
      <MemberAvatar
        userId={node.id}
        name={node.full_name}
        size="table"
        className="shrink-0"
      />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">
            {node.full_name}
          </p>
          {node.designation && (
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {node.designation}
            </p>
          )}
        </div>
        {node.department_names[0] && (
          <span className="text-[10px] text-muted-foreground/50 border 
                           border-border/40 rounded px-1.5 py-0.5 shrink-0 
                           hidden sm:inline whitespace-nowrap">
            {node.department_names[0]}
          </span>
        )}
      </div>
    </Link>
  );
}

// A team block — manager + their direct reports grouped together
// with a subtle background and left border
function TeamBlock({
  node,
  depth,
}: {
  node: OrgNode;
  depth: number;
}) {
  const hasReports = node.reports.length > 0;

  // Accent colors cycle by depth
  const borderColors = [
    "border-primary/30",
    "border-violet-500/30",
    "border-blue-500/30",
    "border-emerald-500/30",
  ];
  const bgColors = [
    "bg-primary/[0.03]",
    "bg-violet-500/[0.03]",
    "bg-blue-500/[0.03]",
    "bg-emerald-500/[0.03]",
  ];
  const borderColor = borderColors[depth % borderColors.length];
  const bgColor = bgColors[depth % bgColors.length];

  if (!hasReports) {
    // Leaf node — just a row, no block
    return <PersonRow node={node} />;
  }

  return (
    <div className={cn(
      "rounded-lg border-l-2 pl-3",
      borderColor,
      bgColor,
      depth > 0 && "ml-4",
    )}>
      {/* Manager row */}
      <PersonRow node={node} />

      {/* Separator */}
      <div className="mx-3 h-px bg-border/30" />

      {/* Direct reports */}
      <div className="py-1 flex flex-col gap-0.5">
        {node.reports.map((child) => (
          <TeamBlock
            key={child.id}
            node={child}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

export function OrgChart({
  roots,
  unsupervised,
}: {
  roots: OrgNode[];
  unsupervised: OrgNode[];
}) {
  if (roots.length === 0 && unsupervised.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No active employees to display.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main hierarchy */}
      <div className="rounded-xl border border-border p-3 flex flex-col gap-2">
        {roots.map((root) => (
          <TeamBlock key={root.id} node={root} depth={0} />
        ))}
      </div>

      {/* Unsupervised section */}
      {unsupervised.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground">
              No supervisor assigned
            </span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="rounded-xl border border-border/50 p-3 flex flex-col gap-1">
            {unsupervised.map((emp) => (
              <PersonRow key={emp.id} node={emp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
