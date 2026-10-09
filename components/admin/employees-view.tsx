"use client";

import { useState } from "react";
import { EmployeeList } from "@/components/admin/employee-list";
import { OrgChart } from "@/components/admin/org-chart";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
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
      <SegmentedFilter
        label="View"
        value={view}
        onChange={setView}
        options={[
          { value: "list", label: "List" },
          { value: "chart", label: "Org chart" },
        ]}
        className="self-start"
      />

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
        <OrgChart
          roots={roots}
          unsupervised={unsupervised}
          employees={employees}
          departments={departments}
        />
      )}
    </div>
  );
}
