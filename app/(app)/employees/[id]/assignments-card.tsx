"use client";

import { useState } from "react";
import { Building2, Clock, FileStack, Pencil, UserCheck } from "lucide-react";
import { AssignDepartmentsDialog } from "@/components/admin/assign-departments-dialog";
import { AssignShiftDialog } from "@/components/admin/assign-shift-dialog";
import { AssignSupervisorsDialog } from "@/components/admin/assign-supervisors-dialog";
import { AssignTemplateDialog } from "@/components/admin/assign-template-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ShiftAssignment } from "@/types/attendance";
import { SHIFT_TYPE_LABELS } from "@/types/attendance";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeDetail, EmployeeListItem } from "@/types/employee";
import type { ReportTemplate } from "@/types/template";

type TemplateInfo = {
  template: { name: string } | null;
  source: "individual" | "department" | "default" | "none";
  sourceName: string | null;
};

type EditableAssignmentsProps = {
  readOnly?: false;
  employee: EmployeeDetail;
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
  templates: ReportTemplate[];
  templateInfo: TemplateInfo;
  currentShift: ShiftAssignment | null;
  orgId: string;
};

// Reports To is omitted in read-only mode: member_supervisors RLS only
// returns rows where the viewer is the supervisor, so a non-admin would
// see an incomplete list.
type ReadOnlyAssignmentsProps = {
  readOnly: true;
  employee: { department_names: string[] };
  templateInfo: TemplateInfo;
  currentShift: ShiftAssignment | null;
};

function EditButton({
  label = "Edit",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 text-xs text-muted-foreground"
      onClick={onClick}
    >
      <Pencil className="mr-1 size-3" />
      {label}
    </Button>
  );
}

export function AssignmentsCard(
  props: EditableAssignmentsProps | ReadOnlyAssignmentsProps,
) {
  const { employee, templateInfo, currentShift } = props;
  const editable = props.readOnly ? null : props;

  const [assignDeptOpen, setAssignDeptOpen] = useState(false);
  const [assignSupervisorsOpen, setAssignSupervisorsOpen] = useState(false);
  const [assignTemplateOpen, setAssignTemplateOpen] = useState(false);
  const [assignShiftOpen, setAssignShiftOpen] = useState(false);

  const supervisorNames = editable
    ? editable.candidates
        .filter((candidate) =>
          editable.employee.supervisor_ids.includes(candidate.id),
        )
        .map((candidate) => candidate.full_name)
    : [];

  const templateSourceLabel =
    templateInfo.source === "individual"
      ? "Individual assignment"
      : templateInfo.source === "department"
        ? `From ${templateInfo.sourceName} dept`
        : templateInfo.source === "default"
          ? "Org default"
          : "Set a default template in Organization settings";

  return (
    <>
      <Card className="card-gradient h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assignments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="label-eyebrow flex items-center gap-1.5">
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
            {editable && <EditButton onClick={() => setAssignDeptOpen(true)} />}
          </div>

          {editable && (
            <>
              <Separator />

              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="label-eyebrow flex items-center gap-1.5">
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
                <EditButton onClick={() => setAssignSupervisorsOpen(true)} />
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="label-eyebrow flex items-center gap-1.5">
                <FileStack className="size-3.5" />
                Report Template
              </p>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {templateInfo.template?.name ?? "No template configured"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {templateSourceLabel}
                </span>
              </div>
            </div>
            {editable && (
              <EditButton onClick={() => setAssignTemplateOpen(true)} />
            )}
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="label-eyebrow flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Shift
              </p>
              {currentShift ? (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {SHIFT_TYPE_LABELS[currentShift.shift_type]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Since {currentShift.effective_from}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No shift assigned
                </span>
              )}
            </div>
            {editable && (
              <EditButton
                label={currentShift ? "Edit" : "Assign"}
                onClick={() => setAssignShiftOpen(true)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {editable && (
        <>
          <AssignDepartmentsDialog
            employee={editable.employee}
            departments={editable.departments}
            open={assignDeptOpen}
            onOpenChange={setAssignDeptOpen}
          />
          <AssignSupervisorsDialog
            employee={editable.employee}
            candidates={editable.candidates}
            open={assignSupervisorsOpen}
            onOpenChange={setAssignSupervisorsOpen}
          />
          <AssignTemplateDialog
            profileId={editable.employee.id}
            personName={editable.employee.full_name}
            currentTemplateId={editable.employee.template_id}
            templates={editable.templates}
            currentTemplateSource={templateInfo.source}
            currentTemplateSourceName={templateInfo.sourceName}
            open={assignTemplateOpen}
            onOpenChange={setAssignTemplateOpen}
          />
          <AssignShiftDialog
            profileId={editable.employee.id}
            orgId={editable.orgId}
            currentShift={currentShift}
            open={assignShiftOpen}
            onOpenChange={setAssignShiftOpen}
          />
        </>
      )}
    </>
  );
}
