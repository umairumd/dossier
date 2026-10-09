"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveTemplate,
  deleteTemplate,
  restoreTemplate,
} from "@/lib/actions/admin/templates";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { ReportTemplate } from "@/types/template";

type ConfirmAction = "archive" | "delete";

const CONFIRM: Record<
  ConfirmAction,
  { title: string; description: string; label: string; success: string }
> = {
  archive: {
    title: "Archive this template?",
    description: "Existing reports using it won't be affected.",
    label: "Archive",
    success: "Template archived.",
  },
  delete: {
    title: "Delete template?",
    description:
      "This can't be undone. Templates that have been used in reports can't be deleted. Archive them instead.",
    label: "Delete",
    success: "Template deleted.",
  },
};

// Row menu for the templates list (same shape as the department menu).
export function TemplateActionsMenu({
  template,
  archived,
}: {
  template: ReportTemplate;
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const config = confirm ? CONFIRM[confirm] : null;

  function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Action failed.");
      } else {
        toast.success(success);
      }
      setConfirm(null);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {!archived ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/organization/templates/${template.id}`}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {!template.isDefault && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setConfirm("archive")}>
                    <Archive className="size-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setConfirm("delete")}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </>
          ) : (
            <>
              <DropdownMenuItem
                onSelect={() =>
                  run(() => restoreTemplate(template.id), "Template restored.")
                }
              >
                <ArchiveRestore className="size-4" />
                Restore
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setConfirm("delete")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{config?.title}</AlertDialogTitle>
            <AlertDialogDescription>{config?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!confirm || !config) return;
                run(
                  () =>
                    confirm === "archive"
                      ? archiveTemplate(template.id)
                      : deleteTemplate(template.id),
                  config.success,
                );
              }}
            >
              {isPending ? "Working..." : config?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
