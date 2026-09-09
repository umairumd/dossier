"use client";

import { useState } from "react";
import { GitBranch, List } from "lucide-react";
import { EmployeeList } from "@/components/admin/employee-list";
import { OrgChart } from "@/components/admin/org-chart";
import { Button } from "@/components/ui/button";
import type { OrgNode } from "@/lib/helpers/org-tree";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem } from "@/types/employee";
import type { ReportTemplate } from "@/types/template";

export function EmployeesView({
  employees,
  currentUserId,
  departments,
  candidates,
  lastSeenByEmployeeId,
  templates,
  roots,
  unsupervised,
}: {
  employees: EmployeeListItem[];
  currentUserId: string;
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
  lastSeenByEmployeeId: Record<string, string>;
  templates: ReportTemplate[];
  roots: OrgNode[];
  unsupervised: OrgNode[];
}) {
  const [view, setView] = useState<"list" | "chart">("list");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 self-start rounded-lg border border-border p-0.5">
        <Button
          variant={view === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("list")}
          className="h-7 gap-1.5"
        >
          <List className="size-3.5" />
          List
        </Button>
        <Button
          variant={view === "chart" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("chart")}
          className="h-7 gap-1.5"
        >
          <GitBranch className="size-3.5" />
          Org Chart
        </Button>
      </div>

      {view === "list" ? (
        <EmployeeList
          employees={employees}
          currentUserId={currentUserId}
          departments={departments}
          candidates={candidates}
          lastSeenByEmployeeId={lastSeenByEmployeeId}
          templates={templates}
        />
      ) : (
        <OrgChart roots={roots} unsupervised={unsupervised} />
      )}
    </div>
  );
}
