"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddDepartmentMemberDialog } from "@/components/admin/add-department-member-dialog";
import { EditDepartmentDialog } from "@/components/admin/edit-department-dialog";
import type { DepartmentListItem, ManagerCandidate } from "@/types/department";
import type { EmployeeListItem } from "@/types/employee";

export function DepartmentDetailActions({
  department,
  managerCandidates,
  managerNote,
  addCandidates,
  variant,
}: {
  department: DepartmentListItem;
  managerCandidates: ManagerCandidate[];
  managerNote?: string;
  addCandidates: EmployeeListItem[];
  variant: "edit" | "change-manager" | "assign-manager" | "add-member";
}) {
  const [open, setOpen] = useState(false);

  if (variant === "add-member") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          + Add Member
        </Button>
        <AddDepartmentMemberDialog
          departmentId={department.id}
          candidates={addCandidates}
          open={open}
          onOpenChange={setOpen}
        />
      </>
    );
  }

  const label =
    variant === "edit"
      ? "Edit"
      : variant === "assign-manager"
        ? "Assign Manager"
        : "Change";

  return (
    <>
      <Button
        variant={variant === "assign-manager" ? "outline" : variant === "edit" ? "outline" : "ghost"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <EditDepartmentDialog
        department={department}
        managerCandidates={managerCandidates}
        managerNote={managerNote}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
