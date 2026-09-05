"use client";

import { useState } from "react";
import { Building2, FileStack, Pencil, UserCheck } from "lucide-react";
import { AssignDepartmentsDialog } from "@/components/admin/assign-departments-dialog";
import { AssignSupervisorsDialog } from "@/components/admin/assign-supervisors-dialog";
import { AssignTemplateDialog } from "@/components/admin/assign-template-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeDetail, EmployeeListItem } from "@/types/employee";
import type { ReportTemplate } from "@/types/template";

export function AssignmentsCard({
  employee,
  departments,
  candidates,
  templates,
  templateInfo,
}: {
  employee: EmployeeDetail;
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
  templates: ReportTemplate[];
  templateInfo: {
    template: { name: string };
    source: "individual" | "department" | "default";
    sourceName: string | null;
  };
}) {
  const [assignDeptOpen, setAssignDeptOpen] = useState(false);
  const [assignSupervisorsOpen, setAssignSupervisorsOpen] = useState(false);
  const [assignTemplateOpen, setAssignTemplateOpen] = useState(false);

  const supervisorNames = candidates
    .filter((candidate) => employee.supervisor_ids.includes(candidate.id))
    .map((candidate) => candidate.full_name);

  const templateSourceLabel =
    templateInfo.source === "individual"
      ? "Individual assignment"
      : templateInfo.source === "department"
        ? `From ${templateInfo.sourceName} dept`
        : "Org default";

  return (
    <>
      <Card className="card-gradient h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assignments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="size-3.5" />
                Departments
              </p>
              <div className="flex flex-wrap gap-1.5">
                {employee.department_names.length > 0 ? (
                  employee.department_names.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No department assigned
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-xs text-muted-foreground"
              onClick={() => setAssignDeptOpen(true)}
            >
              <Pencil className="mr-1 size-3" />
              Edit
            </Button>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserCheck className="size-3.5" />
                Reports To
              </p>
              {supervisorNames.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {supervisorNames.map((name) => (
                    <span key={name} className="text-sm font-medium">
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No supervisor assigned
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-xs text-muted-foreground"
              onClick={() => setAssignSupervisorsOpen(true)}
            >
              <Pencil className="mr-1 size-3" />
              Edit
            </Button>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileStack className="size-3.5" />
                Report Template
              </p>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {templateInfo.template.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {templateSourceLabel}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-xs text-muted-foreground"
              onClick={() => setAssignTemplateOpen(true)}
            >
              <Pencil className="mr-1 size-3" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      <AssignDepartmentsDialog
        employee={employee}
        departments={departments}
        open={assignDeptOpen}
        onOpenChange={setAssignDeptOpen}
      />
      <AssignSupervisorsDialog
        employee={employee}
        candidates={candidates}
        open={assignSupervisorsOpen}
        onOpenChange={setAssignSupervisorsOpen}
      />
      <AssignTemplateDialog
        profileId={employee.id}
        personName={employee.full_name}
        currentTemplateId={employee.template_id}
        templates={templates}
        currentTemplateSource={templateInfo.source}
        currentTemplateSourceName={templateInfo.sourceName}
        open={assignTemplateOpen}
        onOpenChange={setAssignTemplateOpen}
      />
    </>
  );
}
