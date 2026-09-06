"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runMonthlyAccrualAction } from "@/lib/actions/admin/attendance";

export function RunAccrualButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmed = window.confirm(
      "This will add 2 days to all active employees' leave banks. Continue?",
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await runMonthlyAccrualAction();
      if (!result.success) {
        toast.error(result.error ?? "Failed to run accrual.");
        return;
      }
      toast.success(
        `Accrual complete — ${result.updatedCount} employee${result.updatedCount !== 1 ? "s" : ""} updated`,
      );
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? "Running..." : "Run Accrual"}
    </Button>
  );
}
