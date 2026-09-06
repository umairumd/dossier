"use client";

import { useState } from "react";
import { EmployeeActionsMenu } from "@/components/admin/employee-actions-menu";
import type { BotExpression } from "@/components/shared/bot-avatar";
import { ExpressionPills } from "@/components/shared/expression-pills";
import { ProfileHeader } from "@/components/shared/profile-header";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem } from "@/types/employee";
import type { ReportTemplate } from "@/types/template";

export function EmployeeHeroClient({
  name,
  designation,
  isRemote,
  employmentType,
  avatarUrl,
  employee,
  isSelf,
  departments,
  candidates,
  templates,
  currentTemplateSource,
  currentTemplateSourceName,
}: {
  name: string;
  designation?: string | null;
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
  avatarUrl?: string | null;
  employee: EmployeeListItem;
  isSelf: boolean;
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
  templates: ReportTemplate[];
  currentTemplateSource: "individual" | "department" | "default";
  currentTemplateSourceName: string | null;
}) {
  const [expr, setExpr] = useState<BotExpression>("neutral");

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <ProfileHeader
          userId={employee.id}
          name={name}
          designation={designation}
          isRemote={isRemote}
          employmentType={employmentType}
          avatarUrl={avatarUrl}
          avatarSize="2xl"
          expression={expr}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Expressions</span>
          <ExpressionPills onExpression={setExpr} />
        </div>
        <EmployeeActionsMenu
          employee={employee}
          isSelf={isSelf}
          departments={departments}
          candidates={candidates}
          redirectOnDelete="/employees"
          templates={templates}
          currentTemplateSource={currentTemplateSource}
          currentTemplateSourceName={currentTemplateSourceName}
          hideAssignments={true}
        />
      </div>
    </div>
  );
}
