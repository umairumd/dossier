"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
  archiveDepartment,
  archiveDepartmentForce,
  permanentlyDeleteDepartment,
  restoreDepartment,
} from "@/lib/actions/admin/departments";
import type { DepartmentListItem, ManagerCandidate } from "@/types/department";
import { EditDepartmentDialog } from "./edit-department-dialog";

type DialogAction = "archive" | "restore" | "delete";

interface DialogConfig {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "default" | "destructive";
  action: () => Promise<{
    success: boolean;
    error?: string;
    memberCount?: number;
  }>;
  successMessage: string;
}

interface DepartmentActionsMenuProps {
  department: DepartmentListItem;
  managerCandidates: ManagerCandidate[];
}

export function DepartmentActionsMenu({
  department,
  managerCandidates,
}: DepartmentActionsMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);
  const [memberWarningCount, setMemberWarningCount] = useState<number | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);

  const isArchived = !!department.archived_at;

  const dialogConfigs: Record<DialogAction, DialogConfig> = {
    archive: {
      title: "Archive department?",
      description: `${department.name} will no longer be assignable to employees. This can be undone at any time. If anyone is still assigned, you will be asked to confirm before they become unassigned.`,
      confirmLabel: "Archive",
      confirmVariant: "destructive",
      action: () => archiveDepartment(department.id),
      successMessage: "Department archived.",
    },
    restore: {
      title: "Restore department?",
      description: `${department.name} will reappear as an active department and become assignable to employees again.`,
      confirmLabel: "Restore",
      confirmVariant: "default",
      action: () => restoreDepartment(department.id),
      successMessage: "Department restored.",
    },
    delete: {
      title: "Permanently delete this department?",
      description: `This removes ${department.name} from the system entirely. This cannot be undone.`,
      confirmLabel: "Delete Permanently",
      confirmVariant: "destructive",
      action: () => permanentlyDeleteDepartment(department.id),
      successMessage: "Department permanently deleted.",
    },
  };

  const handleConfirm = () => {
    if (!dialogAction) return;

    const config = dialogConfigs[dialogAction];

    startTransition(async () => {
      const result = await config.action();

      if (!result.success) {
        if (dialogAction === "archive" && result.memberCount) {
          setDialogAction(null);
          window.setTimeout(() => {
            setMemberWarningCount(result.memberCount ?? null);
          }, 150);
          return;
        }

        toast.error(result.error ?? "Action failed.");
        setDialogAction(null);
        return;
      }

      toast.success(config.successMessage);
      setDialogAction(null);

      if (dialogAction === "archive") {
        router.push("/departments");
      }
    });
  };

  const handleForceArchive = () => {
    startTransition(async () => {
      const result = await archiveDepartmentForce(department.id);

      if (!result.success) {
        toast.error(result.error ?? "Action failed.");
        setMemberWarningCount(null);
        return;
      }

      toast.success("Department archived.");
      setMemberWarningCount(null);
      router.push("/departments");
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
          <DropdownMenuItem asChild>
            <Link href={`/departments/${department.id}`}>
              <Eye className="size-4" />
              View Department
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {!isArchived ? (
            <DropdownMenuItem onSelect={() => setDialogAction("archive")}>
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => setDialogAction("restore")}>
                <ArchiveRestore className="size-4" />
                Restore
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => setDialogAction("delete")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete Permanently
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDepartmentDialog
        department={department}
        managerCandidates={managerCandidates}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

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

      <AlertDialog
        open={memberWarningCount !== null}
        onOpenChange={(open) => !open && setMemberWarningCount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive department with members?</AlertDialogTitle>
            <AlertDialogDescription>
              This department has {memberWarningCount} active members who will
              become unassigned. Are you sure you want to archive it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleForceArchive}
              disabled={isPending}
            >
              {isPending ? "Working..." : "Archive Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
