"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
    <div className="flex w-full max-w-sm flex-col">
      <Image
        src="/logo.png"
        alt="Dossier"
        width={48}
        height={48}
        className="mx-auto"
        style={{ width: 48, height: 48 }}
      />
      <h1 className="mt-3 text-center text-xl font-semibold">Dossier</h1>

      <Card className="mt-6 w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send reset link"}
            </Button>

            {sent && (
              <p className="text-sm text-muted-foreground">
                Check your inbox — if an account exists for that email
                address, you&apos;ll receive a password reset link within a
                few minutes. Check your spam folder if you don&apos;t see it.
              </p>
            )}

            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to sign in
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
