"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { AuthNotice } from "@/components/auth/auth-card";
import { Field } from "@/components/shared/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({
  initialError,
  initialMessage,
}: {
  initialError?: string;
  initialMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ?? null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {error ? (
        <AuthNotice tone="danger">{error}</AuthNotice>
      ) : initialMessage ? (
        <AuthNotice>{initialMessage}</AuthNotice>
      ) : null}

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
        />
      </Field>

      <Field
        label={
          <span className="flex items-center justify-between">
            Password
            <Link
              href="/forgot-password"
              className="text-xs font-normal text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </span>
        }
        htmlFor="password"
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={isPending}
        />
      </Field>

      <Button type="submit" className="mt-1 w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
