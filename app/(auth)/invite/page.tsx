"use client";

import { useEffect, useState, type ReactNode } from "react";
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

type VerifyStatus = "verifying" | "ready" | "error";

const MIN_PASSWORD_LENGTH = 8;

type TokenParams =
  | { type: "code"; code: string }
  | { type: "hash"; accessToken: string; refreshToken: string };

type ParseResult = {
  error?: string;
  redirecting?: true;
  tokenParams?: TokenParams | null;
};

function inviteErrorCopy(message: string): {
  title: string;
  description: string;
  body: ReactNode;
} {
  const lower = message.toLowerCase();

  if (lower.includes("expired")) {
    return {
      title: "Your invitation has expired",
      description: "This invite link is no longer valid.",
      body: "Contact your admin to send you a fresh invite link.",
    };
  }

  if (lower.includes("invalid") || lower.includes("already")) {
    return {
      title: "Invite link already used",
      description:
        "This link has already been opened in another browser or device.",
      body: (
        <>
          Try opening the app directly at{" "}
          <a
            href="https://my.inomadigital.com"
            className="text-primary hover:underline"
          >
            my.inomadigital.com
          </a>{" "}
          — you may already have an active session. If not, contact your admin
          for a new invite link.
        </>
      ),
    };
  }

  return {
    title: "Something went wrong",
    description: "We couldn't verify your invite link.",
    body: "Please try again. If the problem persists, contact your admin.",
  };
}

// Parses invite tokens from the URL without exchanging them. Exchange
// happens only on password submit so the one-time token stays valid if
// the user closes the tab or opens the same link in another browser.
// An existing session is checked first for return visits after a prior
// exchange (legacy) or mid-flow navigation.
async function parseInviteParams(): Promise<ParseResult> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("has_onboarded")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.has_onboarded) {
      window.location.replace("/");
      return { redirecting: true };
    }

    return { tokenParams: null };
  }

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
    return { tokenParams: { type: "code", code } };
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    return {
      tokenParams: {
        type: "hash",
        accessToken,
        refreshToken,
      },
    };
  }

  return {
    error: "This invitation link is invalid or has already been used.",
  };
}

export default function InvitePage() {
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [tokenParams, setTokenParams] = useState<TokenParams | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    parseInviteParams().then((result) => {
      if (result.redirecting) {
        return;
      }

      if (result.error) {
        setErrorMessage(result.error);
        setStatus("error");
        return;
      }

      setTokenParams(result.tokenParams ?? null);
      // Strip tokens from the URL bar; they are already held in state for submit.
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

    if (tokenParams) {
      if (tokenParams.type === "code") {
        const { error } = await supabase.auth.exchangeCodeForSession(
          tokenParams.code,
        );
        if (error) {
          setFieldError(
            "Link expired or already used. Ask your admin for a new invite.",
          );
          setIsSubmitting(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.setSession({
          access_token: tokenParams.accessToken,
          refresh_token: tokenParams.refreshToken,
        });
        if (error) {
          setFieldError(
            "Link expired or already used. Ask your admin for a new invite.",
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setFieldError(error.message);
      setIsSubmitting(false);
      return;
    }

    await markOnboarded();

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
    const copy = inviteErrorCopy(errorMessage);
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{copy.body}</p>
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
