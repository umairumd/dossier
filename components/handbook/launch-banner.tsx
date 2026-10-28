"use client";

import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { hideHandbook, launchHandbook } from "@/lib/actions/admin/handbook";

/** Owners and admins: launch the handbook, or a quiet "Launched" line after. */
export function HandbookLaunchBanner({
  launchedOn,
  notifyCount,
}: {
  /** "Oct 29", or null before launch. */
  launchedOn: string | null;
  notifyCount: number;
}) {
  const router = useRouter();

  if (launchedOn) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
        <span>Launched for everyone on {launchedOn}.</span>
        <ConfirmActionDialog
          trigger={
            <button
              type="button"
              className="underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground"
            >
              Hide again
            </button>
          }
          title="Hide the handbook again?"
          description="Everyone except owners and admins will see Coming soon. Nobody is notified."
          confirmLabel="Hide"
          successMessage="The handbook is hidden."
          errorMessage="Couldn't hide the handbook."
          action={hideHandbook}
          onSuccess={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl bg-info/8 px-4 py-3 ring-1 ring-inset ring-info/30 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm">
        <span className="font-medium">Only owners and admins can see the handbook.</span>{" "}
        <span className="text-muted-foreground">
          Everyone else sees Coming soon until you launch it. Publishing doesn&apos;t notify anyone
          yet.
        </span>
      </p>
      <ConfirmActionDialog
        trigger={
          <Button type="button" size="sm" className="shrink-0 self-start sm:self-auto">
            <Rocket className="size-3.5" />
            Launch handbook
          </Button>
        }
        title="Launch the handbook?"
        description={`Everyone can open it from the sidebar. ${notifyCount} ${notifyCount === 1 ? "person" : "people"} will get one notification: “The handbook is here”.`}
        confirmLabel="Launch"
        successMessage="The handbook is live."
        errorMessage="Couldn't launch the handbook."
        action={launchHandbook}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
