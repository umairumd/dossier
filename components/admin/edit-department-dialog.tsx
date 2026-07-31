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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignDepartmentManager,
  updateDepartmentName,
} from "@/lib/actions/admin/departments";
import {
  validateDepartmentName,
  type DepartmentFieldErrors,
} from "@/lib/validations/department";
import type { DepartmentListItem, ManagerCandidate } from "@/types/department";

const UNASSIGNED = "unassigned";

interface EditDepartmentDialogProps {
  department: DepartmentListItem;
  managerCandidates: ManagerCandidate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDepartmentDialog({
  department,
  managerCandidates,
  open,
  onOpenChange,
}: EditDepartmentDialogProps) {
  const [name, setName] = useState(department.name);
  const [managerId, setManagerId] = useState(
    department.manager_id ?? UNASSIGNED
  );
  const [fieldErrors, setFieldErrors] = useState<DepartmentFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setName(department.name);
      setManagerId(department.manager_id ?? UNASSIGNED);
      setFieldErrors({});
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateDepartmentName(name);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const nameResult = await updateDepartmentName(department.id, name);
      if (!nameResult.success) {
        setFieldErrors(nameResult.fieldErrors ?? {});
        toast.error(nameResult.error ?? "Couldn't update department.");
        return;
      }

      const nextManagerId = managerId === UNASSIGNED ? null : managerId;
      if (nextManagerId !== department.manager_id) {
        const managerResult = await assignDepartmentManager(
          department.id,
          nextManagerId
        );
        if (!managerResult.success) {
          toast.error(managerResult.error ?? "Couldn't assign manager.");
          return;
        }
      }

      toast.success("Department updated.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update the name or reassign its manager.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`department-name-${department.id}`}>Name</Label>
              <Input
                id={`department-name-${department.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {managerCandidates.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {managerCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No employees have the Manager role yet — assign that role to
                  someone first from the Employees page.
                </p>
              )}
            </div>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
