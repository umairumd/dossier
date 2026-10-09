"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Field, SaveBar, SettingsSection } from "@/components/shared/settings-section";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("Passwords do not match.");
      return;
    }
    setFieldError("");
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      setFieldError(error.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    toast.success("Password updated.");
  };

  return (
    <SettingsSection
      title="Password"
      description={`Choose a new password for your account. At least ${MIN_PASSWORD_LENGTH} characters.`}
      onSubmit={handleSubmit}
      footer={
        <SaveBar
          dirty={password.length > 0 && confirmPassword.length > 0}
          pending={isSubmitting}
          onReset={() => {
            setPassword("");
            setConfirmPassword("");
            setFieldError("");
          }}
          label="Update password"
          pendingLabel="Updating…"
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="new-password">
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm-new-password">
          <Input
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </div>
      {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
    </SettingsSection>
  );
}
