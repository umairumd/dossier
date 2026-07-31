import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { setEmployeeActive } from "@/lib/actions/admin/employees";

export function EmployeeStatusButton({
  employeeId,
  fullName,
  isActive,
  isSelf,
}: {
  employeeId: string;
  fullName: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  // Account safety: an admin can never deactivate their own account —
  // disabled here in the UI as well as blocked server-side in
  // setEmployeeActive, since a signed-in admin has no other action
  // available to undo locking themselves out.
  if (isActive && isSelf) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" disabled>
            Deactivate
          </Button>
        </TooltipTrigger>
        <TooltipContent>You cannot deactivate your own account.</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <ConfirmActionDialog
      trigger={
        <Button variant={isActive ? "outline" : "default"} size="sm">
          {isActive ? "Deactivate" : "Activate"}
        </Button>
      }
      title={isActive ? "Deactivate employee?" : "Activate employee?"}
      description={
        isActive
          ? `${fullName} will immediately lose the ability to sign in. You can reactivate them at any time.`
          : `${fullName} will be able to sign in again.`
      }
      confirmLabel={isActive ? "Deactivate" : "Activate"}
      confirmVariant={isActive ? "destructive" : "default"}
      successMessage={
        isActive ? "Employee deactivated." : "Employee activated."
      }
      errorMessage="Couldn't update employee status."
      action={() => setEmployeeActive(employeeId, !isActive)}
    />
  );
}
