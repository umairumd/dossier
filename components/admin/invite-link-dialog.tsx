"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getInvitationStatus,
  regenerateInviteLink,
} from "@/lib/actions/admin/employees";
import { LocalDateTime } from "@/components/shared/local-datetime";

type InviteState =
  | { type: "loading" }
  | { type: "no-invitation" }
  | {
      type: "has-invitation";
      invitedAt: string;
      expiresAt: string | null;
      inviteLink: string | null;
    }
  | { type: "has-link"; link: string; invitedAt: string; expiresAt: string | null };

interface InviteLinkDialogProps {
  email: string;
  fullName: string;
  orgName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteLinkDialog({
  email,
  fullName,
  orgName,
  open,
  onOpenChange,
}: InviteLinkDialogProps) {
  const [state, setState] = useState<InviteState>({ type: "loading" });
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadStatus = useCallback(() => {
    startTransition(async () => {
      const status = await getInvitationStatus(email);

      if (status.hasActiveInvitation && status.invitedAt) {
        if (status.inviteLink) {
          setState({
            type: "has-link",
            link: status.inviteLink,
            invitedAt: status.invitedAt,
            expiresAt: status.expiresAt,
          });
        } else {
          setState({
            type: "has-invitation",
            invitedAt: status.invitedAt,
            expiresAt: status.expiresAt,
            inviteLink: null,
          });
        }
      } else {
        setState({ type: "no-invitation" });
      }
    });
  }, [email]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (nextOpen) {
        setState({ type: "loading" });
        setCopied(false);
        loadStatus();
      }
    },
    [onOpenChange, loadStatus]
  );

  useEffect(() => {
    if (open) {
      loadStatus();
    }
  }, [open, loadStatus]);

  const handleGenerate = () => {
    setCopied(false);
    startTransition(async () => {
      const result = await regenerateInviteLink(email);

      if (!result.success) {
        toast.error(result.error ?? "Couldn't generate invite link.");
        return;
      }

      if (result.inviteLink) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setState({
          type: "has-link",
          link: result.inviteLink,
          invitedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
        toast.success("Invite link generated. Previous link has been invalidated.");
      }
    });
  };

  const handleCopy = async () => {
    if (state.type !== "has-link") return;

    const organization = orgName?.trim() || "the organization";
    const message = [
      `Hi ${fullName},`,
      ``,
      `You've been invited to join ${organization} on Dossier.`,
      ``,
      `Click the link below to set up your account:`,
      state.link,
      ``,
      `Welcome to the team!`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const isExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getExpirationStatus = (expiresAt: string | null): string => {
    if (!expiresAt) return "";
    const expires = new Date(expiresAt);
    const now = new Date();
    if (expires < now) {
      return "Expired";
    }
    const hoursLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (hoursLeft <= 1) {
      return "Expires in less than 1 hour";
    }
    return `Expires in ${hoursLeft} hours`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Link for {fullName}</DialogTitle>
          <DialogDescription>
            {state.type === "has-link"
              ? "Share this link with the employee. They can use it to set their password and sign in."
              : state.type === "has-invitation"
                ? "An invitation exists but the link is not available. Generate a new link to get a copyable URL."
                : state.type === "no-invitation"
                  ? "No active invitation currently exists for this user."
                  : "Checking invitation status..."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {state.type === "loading" && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}

          {state.type === "no-invitation" && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Generate an invite link to allow {fullName} to set their password
              and sign in.
            </div>
          )}

          {state.type === "has-invitation" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                <AlertCircle className="mt-0.5 size-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Invited on <LocalDateTime isoString={state.invitedAt} />
                  </p>
                  {state.expiresAt && (
                    isExpired(state.expiresAt) ? (
                      <div className="mt-1">
                        <Badge variant="destructive">Expired</Badge>
                      </div>
                    ) : (
                      <p className="mt-1 text-muted-foreground">
                        {getExpirationStatus(state.expiresAt)}
                      </p>
                    )
                  )}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                The original link is no longer available. Generate a new link to
                share with the employee.
              </p>
            </div>
          )}

          {state.type === "has-link" && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>
                    <LocalDateTime isoString={state.invitedAt} />
                  </span>
                </div>
                {state.expiresAt && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {isExpired(state.expiresAt) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <span>{getExpirationStatus(state.expiresAt)}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={state.link}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy invite message"
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {state.type === "has-link" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerate}
                disabled={isPending}
                className="gap-2"
              >
                <RefreshCw
                  className={`size-4 ${isPending ? "animate-spin" : ""}`}
                />
                Regenerate
              </Button>
              <Button type="button" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy Message"}
              </Button>
            </>
          ) : state.type === "loading" ? (
            <Button disabled>Loading...</Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isPending}>
                {isPending ? "Generating..." : "Generate Invite Link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
