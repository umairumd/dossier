"use client";

import { useEffect, useState } from "react";
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

type VerifyStatus = "verifying" | "ready" | "error";

const MIN_PASSWORD_LENGTH = 8;

// Reads whatever Supabase attached to the invite redirect — historically
// this is a URL *fragment* (#access_token=...), which never reaches the
// server (see proxy.ts), so this exchange can only happen client-side. A
// `?code=` query param (PKCE-style) is also checked so this works
// regardless of the project's configured auth flow type.
async function exchangeInviteToken(): Promise<{ error?: string }> {
  const supabase = createClient();

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(window.location.search);

  const errorDescription =
    hashParams.get("error_description") ?? searchParams.get("error_description");
  if (errorDescription) {
    return { error: decodeURIComponent(errorDescription.replace(/\+/g, " ")) };
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { error: "This invitation link has expired or is invalid." };
    }
    return {};
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return {
      error: "This invitation link is invalid or has already been used.",
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return { error: "This invitation link has expired or is invalid." };
  }

  return {};
}

export default function InvitePage() {
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    exchangeInviteToken().then((result) => {
      if (result.error) {
        setErrorMessage(result.error);
        setStatus("error");
        return;
      }

      // The token is single-use and shouldn't linger in the URL/history
      // once it's been exchanged for a session.
      window.history.replaceState(null, "", window.location.pathname);
      setStatus("ready");
    });
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

    // Full navigation, not the client router: guarantees the dashboard's
    // first request carries the just-established session cookies rather
    // than relying on the router's cache picking up the new auth state.
    window.location.href = "/";
  };

  if (status === "verifying") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Verifying your invitation...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invitation link invalid</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ask your admin to resend the invitation from the Employees page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your password</CardTitle>
        <CardDescription>
          Set a password to finish setting up your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fieldError && (
            <p className="text-sm text-destructive">{fieldError}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
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
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create Password & Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
