"use client";

import { useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendInvitation } from "@/lib/actions/admin/employees";

export function ResendInvitationButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await resendInvitation(email);

      if (!result.success) {
        toast.error(result.error ?? "Couldn't resend the invitation.");
        return;
      }

      toast.success(`Invitation resent to ${email}.`);
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      <Mail />
      Resend
    </Button>
  );
}
