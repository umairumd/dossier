"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { Input } from "@/components/ui/input";
import { Field, SaveBar, SettingsSection } from "@/components/shared/settings-section";
import { updateOwnProfile } from "@/lib/actions/settings";

export function ProfileForm({
  initialFullName,
  initialDob,
  email,
  role,
  departmentName,
}: {
  initialFullName: string;
  initialDob?: string | null;
  email: string | null;
  role: string;
  departmentName: string;
}) {
  const [saved, setSaved] = useState({ fullName: initialFullName, dob: initialDob ?? "" });
  const [fullName, setFullName] = useState(initialFullName);
  const [dateOfBirth, setDateOfBirth] = useState(initialDob ?? "");
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
      const result = await updateOwnProfile(
        fullName,
        dateOfBirth.trim() || null,
      );

      if (!result.success) {
        setFieldError(result.fieldErrors?.fullName ?? "");
        toast.error(result.error ?? "Couldn't update profile.");
        mascotBus.emit("save.error");
        return;
      }

      setSaved({ fullName: fullName.trim(), dob: dateOfBirth });
      toast.success("Profile updated.");
    });
  };

  const dirty = fullName.trim() !== saved.fullName || dateOfBirth !== saved.dob;

  return (
    <SettingsSection
      title="Profile"
      description="Your name and birthday. Role and department are set by an admin."
      onSubmit={handleSubmit}
      footer={
        <SaveBar
          dirty={dirty}
          pending={isPending}
          onReset={() => {
            setFullName(saved.fullName);
            setDateOfBirth(saved.dob);
            setFieldError("");
          }}
        />
      }
    >
      <Field label="Full name" htmlFor="full-name" error={fieldError || undefined}>
        <Input
          id="full-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          aria-invalid={!!fieldError}
        />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" value={email ?? ""} disabled readOnly />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" htmlFor="role">
          <Input id="role" value={role} disabled readOnly className="capitalize" />
        </Field>
        <Field label="Department" htmlFor="department">
          <Input id="department" value={departmentName} disabled readOnly />
        </Field>
      </div>
      <Field
        label="Date of birth"
        htmlFor="dob"
        hint="Optional. Used to celebrate your birthday."
      >
        <Input
          id="dob"
          name="date_of_birth"
          type="date"
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="sm:max-w-56"
        />
      </Field>
    </SettingsSection>
  );
}
