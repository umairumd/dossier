"use client";

import { useState, useTransition } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
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
import { inviteEmployee } from "@/lib/actions/admin/employees";
import {
  validateInviteEmployeeInput,
  type EmployeeFieldErrors,
} from "@/lib/validations/employee";
import type { DepartmentOption } from "@/types/department";
import type { UserRole } from "@/types/profile";

export function InviteEmployeeSheet({
  departments,
}: {
  departments: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [departmentId, setDepartmentId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<EmployeeFieldErrors>({});
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setEmail("");
    setFullName("");
    setRole("employee");
    setDepartmentId("");
    setFieldErrors({});
    setInviteLink(null);
    setCopied(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      reset();
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
    const validation = validateInviteEmployeeInput(input);

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await inviteEmployee(input);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Couldn't send the invitation.");
        return;
      }

      toast.success(`Invitation created for ${email}.`);
      setInviteLink(result.inviteLink ?? null);
    });
  };

  const copyLink = async () => {
    if (!inviteLink) {
      return;
    }
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied.");
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button>
          <UserPlus />
          Invite Employee
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Invite Employee</SheetTitle>
          <SheetDescription>
            Creates their account and profile. If email isn&apos;t configured
            for this project, share the generated link with them directly.
          </SheetDescription>
        </SheetHeader>

        {inviteLink ? (
          <div className="flex flex-col gap-4 px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Share this link with {fullName || "the new employee"} so they
              can set a password and sign in.
            </p>
            <div className="flex items-center gap-2">
              <Input value={inviteLink} readOnly className="text-xs" />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={copyLink}
                aria-label="Copy invite link"
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 px-4 pb-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
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
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
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

            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
