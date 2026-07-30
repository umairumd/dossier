"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { permanentlyDeleteDepartment } from "@/lib/actions/admin/departments";

// Only ever rendered for already-archived departments — the action
// re-checks archived_at server-side too.
export function PermanentlyDeleteDepartmentButton({
  departmentId,
  name,
}: {
  departmentId: string;
  name: string;
}) {
  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="destructive" size="sm">
          <Trash2 />
          Delete Permanently
        </Button>
      }
      title="Permanently delete this department?"
      description={`This removes ${name} entirely. Any archived employee still linked to it will simply become unassigned. This cannot be undone.`}
      confirmLabel="Delete Permanently"
      confirmVariant="destructive"
      successMessage="Department permanently deleted."
      errorMessage="Couldn't permanently delete department."
      action={() => permanentlyDeleteDepartment(departmentId)}
    />
  );
}
