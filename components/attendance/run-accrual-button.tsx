"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
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

const ACCRUAL_ALREADY_RUN_ERROR = "Accrual already run for this month";

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
  });
}

export function RunAccrualButton({
  yearMonth,
  accrualDone,
}: {
  yearMonth: string;
  accrualDone: boolean;
}) {
  const [year, month] = yearMonth.split("-").map(Number);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (accrualDone) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Leaves credited
      </div>
    );
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await runMonthlyAccrualAction(year, month);
      if (!result.success) {
        if (result.error === ACCRUAL_ALREADY_RUN_ERROR) {
          toast.error(
            `Accrual already run for ${monthLabel(year, month)} ${year}`,
          );
        } else {
          toast.error(result.error ?? "Failed to run accrual.");
        }
        return;
      }
      toast.success(
        `Accrual complete — ${result.count} employees credited 2 leaves`,
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
        {isPending ? "Running..." : "Credit Monthly Leaves"}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run monthly leave accrual?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add 2 days to all active employees&apos; leave banks for{" "}
              {monthLabel(year, month)} {year}. This cannot be undone.
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
