"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Link2,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  archiveEmployee,
  permanentlyDeleteEmployee,
  restoreEmployee,
  setEmployeeActive,
} from "@/lib/actions/admin/employees";
import type { EmployeeListItem } from "@/types/employee";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { InviteLinkDialog } from "./invite-link-dialog";

type DialogAction = "activate" | "deactivate" | "archive" | "restore" | "delete";

interface DialogConfig {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "default" | "destructive";
  action: () => Promise<{ success: boolean; error?: string }>;
  successMessage: string;
}

interface EmployeeActionsMenuProps {
  employee: EmployeeListItem;
  isSelf: boolean;
  redirectOnDelete?: string;
}

export function EmployeeActionsMenu({
  employee,
  isSelf,
  redirectOnDelete,
}: EmployeeActionsMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteLinkOpen, setInviteLinkOpen] = useState(false);

  const isArchived = employee.status === "archived";
  const isPendingInvite =
    employee.status === "invited" || employee.status === "pending";

  const dialogConfigs: Record<DialogAction, DialogConfig> = {
    activate: {
      title: "Activate employee?",
      description: `${employee.full_name} will be able to sign in again.`,
      confirmLabel: "Activate",
      confirmVariant: "default",
      action: () => setEmployeeActive(employee.id, true),
      successMessage: "Employee activated.",
    },
    deactivate: {
      title: "Deactivate employee?",
      description: `${employee.full_name} will immediately lose the ability to sign in. You can reactivate them at any time.`,
      confirmLabel: "Deactivate",
      confirmVariant: "destructive",
      action: () => setEmployeeActive(employee.id, false),
      successMessage: "Employee deactivated.",
    },
    archive: {
      title: "Archive employee?",
      description: `${employee.full_name} will be removed from the active employee list and unable to sign in. Their submitted reports are kept, and this can be undone at any time.`,
      confirmLabel: "Archive",
      confirmVariant: "destructive",
      action: () => archiveEmployee(employee.id),
      successMessage: "Employee archived.",
    },
    restore: {
      title: "Restore employee?",
      description: `${employee.full_name} will reappear in the active employee list and be able to sign in again (unless separately deactivated).`,
      confirmLabel: "Restore",
      confirmVariant: "default",
      action: () => restoreEmployee(employee.id),
      successMessage: "Employee restored.",
    },
    delete: {
      title: "Permanently delete this employee?",
      description: `This removes ${employee.full_name}'s account and every report they've ever submitted. This cannot be undone, and their email address will become available to invite again.`,
      confirmLabel: "Delete Permanently",
      confirmVariant: "destructive",
      action: () => permanentlyDeleteEmployee(employee.id),
      successMessage: "Employee permanently deleted.",
    },
  };

  const handleConfirm = () => {
    if (!dialogAction) return;

    const config = dialogConfigs[dialogAction];

    startTransition(async () => {
      const result = await config.action();

      if (!result.success) {
        toast.error(result.error ?? "Action failed.");
        setDialogAction(null);
        return;
      }

      toast.success(config.successMessage);
      setDialogAction(null);

      if (dialogAction === "delete" && redirectOnDelete) {
        router.push(redirectOnDelete);
      }
    });
  };

  const currentConfig = dialogAction ? dialogConfigs[dialogAction] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {isPendingInvite && employee.email && (
            <DropdownMenuItem onSelect={() => setInviteLinkOpen(true)}>
              <Link2 className="size-4" />
              Invite Link
            </DropdownMenuItem>
          )}

          {!isArchived && (
            <>
              {employee.is_active ? (
                <DropdownMenuItem
                  onSelect={() => setDialogAction("deactivate")}
                  disabled={isSelf}
                >
                  <PowerOff className="size-4" />
                  Deactivate
                  {isSelf && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      (self)
                    </span>
                  )}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setDialogAction("activate")}>
                  <Power className="size-4" />
                  Activate
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onSelect={() => setDialogAction("archive")}
                disabled={isSelf}
              >
                <Archive className="size-4" />
                Archive
                {isSelf && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    (self)
                  </span>
                )}
              </DropdownMenuItem>
            </>
          )}

          {isArchived && (
            <>
              <DropdownMenuItem onSelect={() => setDialogAction("restore")}>
                <ArchiveRestore className="size-4" />
                Restore
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => setDialogAction("delete")}
                className="text-destructive focus:text-destructive"
                disabled={isSelf}
              >
                <Trash2 className="size-4" />
                Delete Permanently
                {isSelf && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    (self)
                  </span>
                )}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditEmployeeDialog
        employee={employee}
        isSelf={isSelf}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {employee.email && (
        <InviteLinkDialog
          email={employee.email}
          fullName={employee.full_name}
          open={inviteLinkOpen}
          onOpenChange={setInviteLinkOpen}
        />
      )}

      <AlertDialog
        open={dialogAction !== null}
        onOpenChange={(open) => !open && setDialogAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{currentConfig?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {currentConfig?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={currentConfig?.confirmVariant}
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Working..." : currentConfig?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function EmployeeActionsMenuDisabled() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" disabled>
          <MoreHorizontal className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>No actions available</TooltipContent>
    </Tooltip>
  );
}
