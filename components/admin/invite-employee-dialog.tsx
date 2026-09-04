"use client";

import { useState, useTransition, type ReactElement } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogTrigger,
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
import { inviteEmployee } from "@/lib/actions/admin/employees";
import {
  validateInviteEmployeeInput,
  type EmployeeFieldErrors,
} from "@/lib/validations/employee";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem } from "@/types/employee";
import type { UserRole } from "@/types/profile";

const NONE = "__none__";

function unsetIfSentinel(value: string): string | undefined {
  if (!value || value.startsWith("__")) {
    return undefined;
  }
  return value;
}

export function InviteEmployeeDialog({
  departments,
  candidates,
  trigger,
}: {
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [designation, setDesignation] = useState("");
  const [departmentId, setDepartmentId] = useState(NONE);
  const [supervisorId, setSupervisorId] = useState(NONE);
  const [isRemote, setIsRemote] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<EmployeeFieldErrors>({});
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedDept = departments.find(
    (department) => department.id === unsetIfSentinel(departmentId),
  );

  const reset = () => {
    setEmail("");
    setFullName("");
    setRole("member");
    setDesignation("");
    setDepartmentId(NONE);
    setSupervisorId(NONE);
    setIsRemote(false);
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
      designation,
      departmentId: unsetIfSentinel(departmentId),
      supervisorId: unsetIfSentinel(supervisorId),
      isRemote,
    };
    const validation = validateInviteEmployeeInput(input);

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await inviteEmployee(validation.value);

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

  const dialogContent = (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {inviteLink ? "Invitation Created" : "Invite Employee"}
          </DialogTitle>
          <DialogDescription>
            {inviteLink
              ? "Share this link with the employee so they can set a password and sign in."
              : "An invite link will be generated. Share it with the employee so they can set their password and access Dossier."}
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <>
            <DialogBody>
              <div className="flex items-center gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={copyLink}
                  aria-label="Copy invite link"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                onClick={copyLink}
              >
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogBody>
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
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>
                  Designation{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  placeholder="e.g. Graphic Designer, Senior Developer"
                  value={designation}
                  onChange={(event) => setDesignation(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Job title shown to the team
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>
                  Department{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDept?.manager_name && (
                  <p className="text-xs text-muted-foreground">
                    Manager: {selectedDept.manager_name}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>
                  Supervisor{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Select value={supervisorId} onValueChange={setSupervisorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {candidates
                      .filter((candidate) => candidate.status === "active")
                      .map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.full_name}
                          {candidate.designation ? ` · ${candidate.designation}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This person will see their daily reports
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_remote"
                  checked={isRemote}
                  onCheckedChange={(value) => setIsRemote(!!value)}
                />
                <Label htmlFor="is_remote" className="font-normal">
                  Remote employee
                </Label>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Invite Employee
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
