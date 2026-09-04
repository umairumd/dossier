"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      {error && <p className="text-sm text-destructive">{error}</p>}
      {initialMessage && (
        <p className="text-sm text-muted-foreground">{initialMessage}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={isPending}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        variant="default"
        className="mt-2"
        disabled={isPending}
      >
        {isPending ? (
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Signing in...
          </div>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
