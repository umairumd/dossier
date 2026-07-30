"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile } from "@/lib/actions/settings";

export function ProfileForm({
  initialFullName,
  email,
  role,
  departmentName,
}: {
  initialFullName: string;
  email: string | null;
  role: string;
  departmentName: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [fieldError, setFieldError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName.trim()) {
      setFieldError("Name is required.");
      return;
    }
    setFieldError("");

    startTransition(async () => {
      const result = await updateOwnProfile(fullName);

      if (!result.success) {
        setFieldError(result.fieldErrors?.fullName ?? "");
        toast.error(result.error ?? "Couldn't update profile.");
        return;
      }

      toast.success("Profile updated.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full-name">Full name</Label>
        <Input
          id="full-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          aria-invalid={!!fieldError}
        />
        {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email ?? ""} disabled readOnly />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Role</Label>
          <Input value={role} disabled readOnly className="capitalize" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Department</Label>
          <Input value={departmentName} disabled readOnly />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
