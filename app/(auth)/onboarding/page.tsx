"use client";

import { useEffect, useState } from "react";
import { markOnboarded } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { AuthCard, AuthNotice } from "@/components/auth/auth-card";
import { Field } from "@/components/shared/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN_PASSWORD_LENGTH = 8;

export default function OnboardingPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.replace("/login");
        return;
      }
      setReady(true);
    };

    void checkSession();
  }, []);

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

    if (error) {
      setFieldError(error.message);
      setIsSubmitting(false);
      return;
    }

    if (dateOfBirth.trim()) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error: dobError } = await supabase
          .from("profiles")
          .update({ date_of_birth: dateOfBirth })
          .eq("id", user.id);
        if (dobError) {
          console.error("Failed to save date of birth:", dobError);
        }
      }
    }

    const onboardResult = await markOnboarded();

    if (onboardResult?.error) {
      console.error("markOnboarded failed:", onboardResult.error);
    }

    window.location.href = "/";
  };

  if (!ready) {
    return (
      <AuthCard
        title="Welcome to Dossier"
        description="Getting things ready…"
      />
    );
  }

  return (
    <AuthCard
      title="Welcome to Dossier"
      description="This is your first sign-in. Set a password you'll use from now on."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fieldError && <AuthNotice tone="danger">{fieldError}</AuthNotice>}

        <Field
          label="Password"
          htmlFor="password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirm">
          <Input
            id="confirm"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <Field
          label="Date of birth"
          htmlFor="dob"
          hint="Optional. Only used to celebrate your birthday."
        >
          <Input
            id="dob"
            name="date_of_birth"
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Setting up…" : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}
