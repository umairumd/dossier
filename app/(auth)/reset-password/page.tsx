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

// Recovery emails must use the token_hash confirm route (see Supabase
// Authentication > Email Templates > Reset Password):
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
// Also allow {SITE_URL}/auth/confirm and {SITE_URL}/reset-password in Redirect URLs.

type VerifyStatus = "verifying" | "ready" | "error";

const MIN_PASSWORD_LENGTH = 8;

async function exchangeResetToken(): Promise<{ error?: string }> {
  const supabase = createClient();

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(window.location.search);

  // #region agent log
  const searchEntries = Object.fromEntries(searchParams.entries());
  const hashEntries = Object.fromEntries(hashParams.entries());
  const verifierCookieNames = document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((name) => name.includes("code-verifier") || name.includes("auth"));
  const debugPayload = {
    href: window.location.href,
    hash: window.location.hash,
    search: window.location.search,
    searchParams: searchEntries,
    hashParams: Object.fromEntries(
      Object.entries(hashEntries).map(([k, v]) => [
        k,
        ["access_token", "refresh_token", "token", "token_hash"].includes(k)
          ? `[redacted len=${v.length}]`
          : v,
      ]),
    ),
    searchKeys: [...searchParams.keys()],
    hashKeys: [...hashParams.keys()],
    hasCode: searchParams.has("code"),
    hasTokenHash: searchParams.has("token_hash") || hashParams.has("token_hash"),
    hasAccessToken: hashParams.has("access_token"),
    hasRefreshToken: hashParams.has("refresh_token"),
    verifierCookieNames,
  };
  console.log("[DEBUG reset-password] exchangeResetToken URL state:", {
    ...debugPayload,
    searchParams: searchEntries,
    hashParams: hashEntries,
  });
  fetch("http://127.0.0.1:7632/ingest/5b62dd9c-ca47-4ea0-8824-9f867e88198d", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "b4d57c",
    },
    body: JSON.stringify({
      sessionId: "b4d57c",
      runId: "post-fix",
      hypothesisId: "A-B-C-E",
      location: "reset-password/page.tsx:exchangeResetToken",
      message: "URL state at exchangeResetToken entry",
      data: debugPayload,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const queryError = searchParams.get("error");
  if (queryError) {
    return { error: queryError };
  }

  const errorDescription =
    hashParams.get("error_description") ?? searchParams.get("error_description");
  if (errorDescription) {
    // #region agent log
    console.log("[DEBUG reset-password] branch=error_description", errorDescription);
    // #endregion
    return { error: decodeURIComponent(errorDescription.replace(/\+/g, " ")) };
  }

  // Session already established by /auth/confirm (verifyOtp / code exchange).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  // #region agent log
  console.log("[DEBUG reset-password] branch=session_check", {
    hasSession: !!session,
  });
  // #endregion
  if (session) {
    return {};
  }

  // Legacy PKCE emails that still land here with ?code= — hand off to the
  // server confirm route (still requires a code_verifier cookie).
  const code = searchParams.get("code");
  if (code) {
    // #region agent log
    console.log("[DEBUG reset-password] branch=redirect_to_confirm", {
      codeLen: code.length,
    });
    // #endregion
    window.location.replace(
      `/auth/confirm?code=${encodeURIComponent(code)}&next=/reset-password`,
    );
    return {};
  }

  const tokenHash =
    searchParams.get("token_hash") ?? hashParams.get("token_hash");
  const type = searchParams.get("type") ?? hashParams.get("type");
  if (tokenHash && type) {
    // #region agent log
    console.log("[DEBUG reset-password] branch=redirect_token_hash_to_confirm");
    // #endregion
    window.location.replace(
      `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&next=/reset-password`,
    );
    return {};
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!accessToken || !refreshToken) {
    // #region agent log
    console.log("[DEBUG reset-password] branch=missing_tokens", {
      searchKeys: [...searchParams.keys()],
      hashKeys: [...hashParams.keys()],
      verifierCookieNames,
    });
    // #endregion
    return {
      error: "This reset link is invalid or has already been used.",
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // #region agent log
  console.log("[DEBUG reset-password] branch=implicit_setSession", {
    setSessionError: error?.message ?? null,
  });
  // #endregion

  if (error) {
    return { error: "This reset link has expired or is invalid." };
  }

  return {};
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    exchangeResetToken().then((result) => {
      if (result.error) {
        setErrorMessage(result.error);
        setStatus("error");
        return;
      }

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

    await supabase.auth.signOut();
    window.location.href =
      "/login?message=" +
      encodeURIComponent("Your password has been updated. Sign in to continue.");
  };

  if (status === "verifying") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Verifying your reset link...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset link invalid</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Request a new reset link from the sign-in page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>
          Choose a new password for your account.
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
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
