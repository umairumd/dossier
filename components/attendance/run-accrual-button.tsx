"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { runMonthlyAccrualAction } from "@/lib/actions/admin/attendance";

export function RunAccrualButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await runMonthlyAccrualAction();
      if (!result.success) {
        toast.error(result.error ?? "Failed to run accrual.");
        return;
      }
      toast.success(
        `Accrual complete — ${result.updatedCount} employee${result.updatedCount !== 1 ? "s" : ""} updated`,
      );
      setConfirmOpen(false);
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
      >
        {isPending ? "Running..." : "Run Accrual"}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run monthly leave accrual?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add 2 days to all active employees&apos; leave banks.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
              {isPending ? "Running…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
