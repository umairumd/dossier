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
import { assignMemberSupervisors } from "@/lib/actions/admin/employees";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import type { EmployeeListItem } from "@/types/employee";

interface AssignSupervisorsDialogProps {
  employee: EmployeeListItem;
  candidates: EmployeeListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignSupervisorsDialog({
  employee,
  candidates,
  open,
  onOpenChange,
}: AssignSupervisorsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    employee.supervisor_ids,
  );
  const [isPending, startTransition] = useTransition();

  const eligibleCandidates = candidates.filter(
    (candidate) =>
      candidate.id !== employee.id &&
      candidate.status !== "archived" &&
      candidate.is_active,
  );

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setSelectedIds(employee.supervisor_ids);
    }
  };

  const toggleSupervisor = (supervisorId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked
        ? [...current, supervisorId]
        : current.filter((id) => id !== supervisorId),
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await assignMemberSupervisors(employee.id, selectedIds);

      if (!result.success) {
        toast.error(result.error ?? "Couldn't update supervisors.");
        return;
      }

      toast.success("Supervisors updated.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Supervisors</DialogTitle>
          <DialogDescription>
            {employee.full_name} · select one or more supervisors
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {eligibleCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other team members available.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {eligibleCandidates.map((candidate) => {
                const checkboxId = `sup-${employee.id}-${candidate.id}`;
                return (
                  <div key={candidate.id} className="flex items-center gap-2">
                    <Checkbox
                      id={checkboxId}
                      checked={selectedIds.includes(candidate.id)}
                      onCheckedChange={(checked) =>
                        toggleSupervisor(candidate.id, checked === true)
                      }
                    />
                    <Label htmlFor={checkboxId}>
                      {candidate.full_name}
                      <span className="font-normal text-muted-foreground">
                        {getRoleLabel(candidate.role)}
                      </span>
                    </Label>
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
