"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveTemplate,
  deleteTemplate,
  restoreTemplate,
} from "@/lib/actions/admin/templates";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ArchiveTemplateButton({
  templateId,
}: {
  templateId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await archiveTemplate(templateId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to archive template.");
        return;
      }
      toast.success("Template archived.");
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Archive
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this template?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing reports using it won&apos;t be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RestoreTemplateButton({
  templateId,
}: {
  templateId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreTemplate(templateId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to restore template.");
        return;
      }
      toast.success("Template restored.");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestore}
      disabled={isPending}
    >
      {isPending ? "Restoring..." : "Restore"}
    </Button>
  );
}

export function DeleteTemplateButton({
  templateId,
}: {
  templateId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTemplate(templateId);
      if (result.success) {
        toast.success("Template deleted.");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Failed to delete template.");
        setOpen(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Templates that have been used in
            reports cannot be deleted — archive them instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
