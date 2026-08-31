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
import { EmployeeStatusBadge } from "@/components/admin/employee-status-badge";
import { updateEmployee } from "@/lib/actions/admin/employees";
import {
  validateEditEmployeeInput,
  type EmployeeFieldErrors,
} from "@/lib/validations/employee";
import type { EmployeeListItem } from "@/types/employee";
import type { UserRole } from "@/types/profile";

interface EditEmployeeDialogProps {
  employee: EmployeeListItem;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({
  employee,
  isSelf,
  open,
  onOpenChange,
}: EditEmployeeDialogProps) {
  const [email, setEmail] = useState(employee.email ?? "");
  const [fullName, setFullName] = useState(employee.full_name);
  const [role, setRole] = useState<UserRole>(employee.role);
  const [fieldErrors, setFieldErrors] = useState<EmployeeFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setEmail(employee.email ?? "");
      setFullName(employee.full_name);
      setRole(employee.role);
      setFieldErrors({});
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input = { email, fullName, role };
    const validation = validateEditEmployeeInput(input);

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await updateEmployee({ id: employee.id, ...input });

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Couldn't update employee.");
        return;
      }

      toast.success("Employee updated.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            <span className="flex items-center gap-2">
              {employee.email ?? employee.full_name}
              <EmployeeStatusBadge status={employee.status} />
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-email-${employee.id}`}>Email</Label>
              <Input
                id={`edit-email-${employee.id}`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-name-${employee.id}`}>Full name</Label>
              <Input
                id={`edit-name-${employee.id}`}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                aria-invalid={!!fieldErrors.fullName}
              />
              {fieldErrors.fullName && (
                <p className="text-sm text-destructive">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={isSelf}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employee.role === "owner" && (
                    <SelectItem value="owner">Owner</SelectItem>
                  )}
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin (HR)</SelectItem>
                </SelectContent>
              </Select>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  You cannot change your own role.
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Use Activate/Deactivate or Archive/Restore from the actions menu
              to change account access.
            </p>
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
