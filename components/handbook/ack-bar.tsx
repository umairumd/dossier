"use client";

import { useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acknowledgeHandbookDoc } from "@/lib/actions/handbook";
import { formatLongDate } from "@/lib/handbook/format";

/** Sticky "Please confirm you've read version N" bar, then the confirmation date. */
export function AckBar({
  docId,
  version,
  confirmedAt,
  timeZone,
}: {
  docId: string;
  version: number;
  /** When the current version was confirmed, if it was. */
  confirmedAt: string | null;
  timeZone: string;
}) {
  const [confirmed, setConfirmed] = useState(confirmedAt);
  const [pending, startTransition] = useTransition();

  if (confirmed) {
    return (
      <p className="flex items-center gap-2 border-t border-line pt-4 text-sm text-muted-foreground">
        <CircleCheck aria-hidden className="size-4 text-ok" />
        You confirmed on {formatLongDate(confirmed, timeZone)}.
      </p>
    );
  }

  const confirm = () => {
    startTransition(async () => {
      const result = await acknowledgeHandbookDoc(docId);
      if (!result.success) {
        toast.error(result.error ?? "Couldn't save that. Try again.");
        return;
      }
      setConfirmed(result.acknowledgedAt ?? new Date().toISOString());
      toast.success("Thanks for confirming.");
    });
  };

  return (
    <div className="sticky bottom-4 z-10">
      <div className="surface-overlay flex flex-col gap-3 rounded-xl bg-popover px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          Please confirm you&apos;ve read version {version}
        </p>
        <Button onClick={confirm} disabled={pending} className="shrink-0">
          {pending ? "Saving…" : "I've read and understood this"}
        </Button>
      </div>
    </div>
  );
}
