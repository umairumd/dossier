"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { assignMemberDepartments } from "@/lib/actions/admin/employees";
import type { EmployeeListItem } from "@/types/employee";
import type { DepartmentOption } from "@/types/department";

interface AssignDepartmentsDialogProps {
  employee: EmployeeListItem;
  departments: DepartmentOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignDepartmentsDialog({
  employee,
  departments,
  open,
  onOpenChange,
}: AssignDepartmentsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    employee.department_ids,
  );
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setSelectedIds(employee.department_ids);
    }
  };

  const toggleDepartment = (departmentId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked
        ? [...current, departmentId]
        : current.filter((id) => id !== departmentId),
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await assignMemberDepartments(employee.id, selectedIds);

      if (!result.success) {
        toast.error(result.error ?? "Couldn't update departments.");
        return;
      }

      toast.success("Departments updated.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Departments</DialogTitle>
          <DialogDescription>
            {employee.full_name} · select one or more departments
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments created yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {departments.map((department) => {
                const checkboxId = `dept-${employee.id}-${department.id}`;
                return (
                  <div key={department.id} className="flex items-center gap-2">
                    <Checkbox
                      id={checkboxId}
                      checked={selectedIds.includes(department.id)}
                      onCheckedChange={(checked) =>
                        toggleDepartment(department.id, checked === true)
                      }
                    />
                    <Label htmlFor={checkboxId}>{department.name}</Label>
                  </div>
                );
              })}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
