"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmployeeStatusBadge } from "@/components/admin/employee-status-badge";
import { updateEmployee } from "@/lib/actions/admin/employees";
import {
  validateEditEmployeeInput,
  type EmployeeFieldErrors,
} from "@/lib/validations/employee";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem } from "@/types/employee";
import type { UserRole } from "@/types/profile";

export function EditEmployeeSheet({
  employee,
  departments,
}: {
  employee: EmployeeListItem;
  departments: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(employee.email ?? "");
  const [fullName, setFullName] = useState(employee.full_name);
  const [role, setRole] = useState<UserRole>(employee.role);
  const [departmentId, setDepartmentId] = useState(
    employee.department_id ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<EmployeeFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setEmail(employee.email ?? "");
      setFullName(employee.full_name);
      setRole(employee.role);
      setDepartmentId(employee.department_id ?? "");
      setFieldErrors({});
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input = {
      email,
      fullName,
      role,
      departmentId: departmentId || null,
    };
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
      setOpen(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${employee.full_name}`}
        >
          <Pencil />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Employee</SheetTitle>
          <SheetDescription>
            <span className="flex items-center gap-2">
              {employee.email ?? employee.full_name}
              <EmployeeStatusBadge status={employee.status} />
            </span>
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 px-4 pb-4"
        >
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
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role !== "admin" && (
            <div className="flex flex-col gap-1.5">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger
                  className="w-full"
                  aria-invalid={!!fieldErrors.departmentId}
                >
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.departmentId && (
                <p className="text-sm text-destructive">
                  {fieldErrors.departmentId}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Use Activate/Deactivate or Archive/Restore from the employee list
            to change account access.
          </p>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
