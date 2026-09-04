"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface ActionResult {
  success: boolean;
  error?: string;
}

// Shared by every Archive/Restore/Activate/Deactivate confirmation across
// Employees and Departments — one place for the "are you sure?" pattern
// instead of re-implementing the same trigger/dialog/toast wiring per action.
export function ConfirmActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  successMessage,
  errorMessage,
  action,
  onSuccess,
}: {
  trigger: React.ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  successMessage: string;
  errorMessage: string;
  action: () => Promise<ActionResult>;
  // For actions where the current page's record ceases to exist
  // afterward (e.g. permanent delete from a detail page) — the list-page
  // callers rely on revalidatePath alone, since a row just disappearing
  // from a still-valid list is enough.
  onSuccess?: () => void;
}) {
  const [, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await action();

      if (!result.success) {
        toast.error(result.error ?? errorMessage);
        return;
      }

      toast.success(successMessage);
      onSuccess?.();
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={confirmVariant} onClick={handleConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
