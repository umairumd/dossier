"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ConfirmContent() {
  const searchParams = useSearchParams();

  // Preserve all params and forward to reset-password
  const params = searchParams.toString();

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
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Click the button below to proceed to the password reset page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => {
              window.location.href = `/reset-password${params ? `?${params}` : ""}`;
            }}
          >
            Continue to Reset Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
