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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignShiftAction } from "@/lib/actions/admin/attendance";
import { SHIFT_TYPE_LABELS } from "@/types/attendance";
import type { ShiftType, ShiftAssignment } from "@/types/attendance";

export function AssignShiftDialog({
  profileId,
  orgId,
  currentShift,
  open,
  onOpenChange,
}: {
  profileId: string;
  orgId: string;
  currentShift: ShiftAssignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [shiftType, setShiftType] = useState<ShiftType>(
    currentShift?.shift_type ?? "fulltime",
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setShiftType(currentShift?.shift_type ?? "fulltime");
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await assignShiftAction(
        profileId,
        orgId,
        shiftType,
        effectiveFrom,
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed to assign shift.");
        return;
      }
      toast.success("Shift assigned.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Shift</DialogTitle>
          <DialogDescription>
            Set the employee&apos;s shift type and when it takes effect.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-type">Shift Type</Label>
            <Select
              value={shiftType}
              onValueChange={(value) => setShiftType(value as ShiftType)}
            >
              <SelectTrigger id="shift-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(SHIFT_TYPE_LABELS) as [ShiftType, string][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="effective-from">Effective From</Label>
            <Input
              id="effective-from"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
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
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Assign Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
