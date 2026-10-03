"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    const label = `Leaves credited for ${monthLabel(year, month)}`;
    return (
      <TooltipProvider>
        <Tooltip>
          <Popover>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-md text-emerald-500 hover:bg-foreground/5"
                  aria-label={label}
                >
                  <CheckCircle2 className="size-4" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
            <PopoverContent className="w-auto px-3 py-2 text-sm">
              {label}
            </PopoverContent>
          </Popover>
        </Tooltip>
      </TooltipProvider>
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
