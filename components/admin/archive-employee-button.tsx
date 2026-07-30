import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { archiveEmployee, restoreEmployee } from "@/lib/actions/admin/employees";

export function ArchiveEmployeeButton({
  employeeId,
  fullName,
  isArchived,
}: {
  employeeId: string;
  fullName: string;
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
        title="Restore employee?"
        description={`${fullName} will reappear in the active employee list and be able to sign in again (unless separately deactivated).`}
        confirmLabel="Restore"
        successMessage="Employee restored."
        errorMessage="Couldn't restore employee."
        action={() => restoreEmployee(employeeId)}
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
      title="Archive employee?"
      description={`${fullName} will be removed from the active employee list and unable to sign in. Their submitted reports are kept, and this can be undone at any time.`}
      confirmLabel="Archive"
      confirmVariant="destructive"
      successMessage="Employee archived."
      errorMessage="Couldn't archive employee."
      action={() => archiveEmployee(employeeId)}
    />
  );
}
