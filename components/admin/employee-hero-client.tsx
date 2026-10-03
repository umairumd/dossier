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
  currentTemplateSource: "individual" | "department" | "default" | "none";
  currentTemplateSourceName: string | null;
}) {
  const [expr, setExpr] = useState<BotExpression>("neutral");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <ProfileHeader
          userId={employee.id}
          name={name}
          designation={designation}
          isRemote={isRemote}
          employmentType={employmentType}
          avatarUrl={avatarUrl}
          avatarSize="2xl"
          interactive={true}
          expression={expr}
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:order-2">
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
          separateEditButton
        />
      </div>

      <div className="flex basis-full items-center gap-3 sm:order-1 sm:basis-auto">
        <span className="text-xs text-muted-foreground">Expressions</span>
        <ExpressionPills onExpression={setExpr} />
      </div>
    </div>
  );
}
