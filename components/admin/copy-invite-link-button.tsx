"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { regenerateInviteLink } from "@/lib/actions/admin/employees";

interface CopyInviteLinkButtonProps {
  email: string;
  fullName: string;
}

export function CopyInviteLinkButton({
  email,
  fullName,
}: CopyInviteLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && !inviteLink) {
      handleRegenerate();
    }
    if (!next) {
      setInviteLink(null);
      setCopied(false);
    }
  };

  const handleRegenerate = () => {
    setCopied(false);
    startTransition(async () => {
      const result = await regenerateInviteLink(email);

      if (!result.success) {
        toast.error(result.error ?? "Couldn't generate invite link.");
        setOpen(false);
        return;
      }

      setInviteLink(result.inviteLink ?? null);
    });
  };

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invite link copied to clipboard.");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 />
          Invite Link
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Invite Link</SheetTitle>
          <SheetDescription>
            Share this link with {fullName} so they can set a password and sign
            in. The previous link has been invalidated.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {isPending ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Generating invite link...
            </p>
          ) : inviteLink ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  aria-label="Copy invite link"
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleRegenerate}
              >
                Generate New Link
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Failed to generate link. Close and try again.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
