import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import {
  archiveDepartment,
  restoreDepartment,
} from "@/lib/actions/admin/departments";

export function ArchiveDepartmentButton({
  departmentId,
  name,
  isArchived,
}: {
  departmentId: string;
  name: string;
  isArchived: boolean;
}) {
  if (isArchived) {
    return (
      <ConfirmActionDialog
        trigger={
          <Button variant="outline" size="sm">
            <ArchiveRestore />
            Restore
          </Button>
        }
        title="Restore department?"
        description={`${name} will reappear as an active department and become assignable to employees again.`}
        confirmLabel="Restore"
        successMessage="Department restored."
        errorMessage="Couldn't restore department."
        action={() => restoreDepartment(departmentId)}
      />
    );
  }

  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="outline" size="sm">
          <Archive />
          Archive
        </Button>
      }
      title="Archive department?"
      description={`${name} will no longer be assignable to employees. This can be undone at any time. If anyone is still assigned to it, archiving will be blocked until they're reassigned or archived.`}
      confirmLabel="Archive"
      confirmVariant="destructive"
      successMessage="Department archived."
      errorMessage="Couldn't archive department."
      action={() => archiveDepartment(departmentId)}
    />
  );
}
