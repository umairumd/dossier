"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
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
  const [sent, formAction, isPending] = useActionState(
    requestPasswordReset,
    false,
  );

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
          <form action={formAction} className="flex flex-col gap-4">
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
                If an account exists with that email, you&apos;ll receive a
                reset link shortly.
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
