"use client";

import { useState, useTransition, type ReactElement } from "react";
import { Copy, UserPlus } from "lucide-react";
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
import { cn } from "@/lib/utils";

const NONE = "__none__";

function SegmentedOption({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex-1 rounded-md border px-3 py-2 text-sm",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function unsetIfSentinel(value: string): string | undefined {
  if (!value || value.startsWith("__")) {
    return undefined;
  }
  return value;
}

export function InviteEmployeeDialog({
  departments,
  candidates,
  orgName,
  trigger,
}: {
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
  orgName?: string | null;
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
  const [employmentType, setEmploymentType] = useState<
    "full_time" | "part_time"
  >("full_time");
  const [fieldErrors, setFieldErrors] = useState<EmployeeFieldErrors>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);
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
    setEmploymentType("full_time");
    setFieldErrors({});
    setTempPassword(null);
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
      employmentType,
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
      setTempPassword(result.tempPassword ?? null);
    });
  };

  const copyPassword = async () => {
    if (!tempPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(tempPassword);
      toast.success("Password copied");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const siteHost = siteUrl.replace(/^https?:\/\//, "");

  const copyMessage = async () => {
    if (!tempPassword) {
      return;
    }

    const organization = orgName?.trim() || "the organization";
    const message = [
      `Hi ${fullName},`,
      ``,
      `You've been invited to join ${organization} on Dossier.`,
      ``,
      `Login at: ${siteUrl}`,
      `Email: ${email}`,
      `Temporary password: ${tempPassword}`,
      ``,
      `You'll be asked to set a new password when you first log in.`,
      ``,
      `Welcome to the team!`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const dialogContent = (
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tempPassword ? "Employee Invited" : "Invite Employee"}
          </DialogTitle>
          <DialogDescription>
            {tempPassword
              ? `Share these credentials with ${fullName}`
              : "A temporary password will be generated. Share it with the employee so they can sign in and set their own password."}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <>
            <DialogBody>
              <div className="flex flex-col gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Website</span>
                  <span>{siteHost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="max-w-[180px] truncate">{email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Password</span>
                  <div className="flex items-center gap-2">
                    <span>{tempPassword}</span>
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Copy password"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                They&apos;ll be asked to change their password on first login.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                onClick={copyMessage}
              >
                {copied ? "Copied!" : "Copy Message"}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="invite-name">Full Name</Label>
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
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <Label>Employment Type</Label>
                  <div className="flex gap-2">
                    <SegmentedOption
                      selected={employmentType === "full_time"}
                      onSelect={() => setEmploymentType("full_time")}
                    >
                      Full-time
                    </SegmentedOption>
                    <SegmentedOption
                      selected={employmentType === "part_time"}
                      onSelect={() => setEmploymentType("part_time")}
                    >
                      Part-time
                    </SegmentedOption>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Work Location</Label>
                  <div className="flex gap-2">
                    <SegmentedOption
                      selected={!isRemote}
                      onSelect={() => setIsRemote(false)}
                    >
                      On-site
                    </SegmentedOption>
                    <SegmentedOption
                      selected={isRemote}
                      onSelect={() => setIsRemote(true)}
                    >
                      Remote
                    </SegmentedOption>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            {candidate.designation
                              ? ` · ${candidate.designation}`
                              : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
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
