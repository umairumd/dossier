"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthCard, AuthNotice } from "@/components/auth/auth-card";
import { Field } from "@/components/shared/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = (
      event.currentTarget.elements.namedItem("email") as HTMLInputElement
    ).value;
    if (!email) return;

    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    setIsPending(false);
    setSent(true);
  };

  return (
    <AuthCard
      title="Reset password"
      description="Enter your email and we'll send you a reset link."
      footer={<Link href="/login">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {sent && (
          <AuthNotice>
            If an account exists for that email, a reset link is on its way.
            It can take a few minutes; check spam if you don&apos;t see it.
          </AuthNotice>
        )}

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>

        <Button type="submit" className="mt-1 w-full" disabled={isPending}>
          {isPending ? "Sending…" : sent ? "Send again" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
