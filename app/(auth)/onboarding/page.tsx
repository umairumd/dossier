"use client";

import { useEffect, useState } from "react";
import { markOnboarded } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>
          You&apos;re logging in for the first time. Please set a permanent
          password to secure your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fieldError && (
            <p className="text-sm text-destructive">{fieldError}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dob">Date of Birth (optional)</Label>
            <Input
              id="dob"
              name="date_of_birth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Used for birthday recognition.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? "Setting up your account..."
              : "Set Password & Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
