"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addEmployeeToDepartment } from "@/lib/actions/admin/departments";
import type { EmployeeListItem } from "@/types/employee";

export function AddDepartmentMemberDialog({
  departmentId,
  candidates,
  open,
  onOpenChange,
}: {
  departmentId: string;
  candidates: EmployeeListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setEmployeeId("");
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeId) {
      toast.error("Select an employee to add.");
      return;
    }

    startTransition(async () => {
      const result = await addEmployeeToDepartment(employeeId, departmentId);
      if (!result.success) {
        toast.error(result.error ?? "Couldn't add member.");
        return;
      }
      toast.success("Member added.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add an existing employee to this department. Their other department
            assignments are kept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Everyone is already in this department.
              </p>
            ) : (
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button
              type="submit"
              disabled={isPending || candidates.length === 0}
            >
              {isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
