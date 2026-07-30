import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { setEmployeeActive } from "@/lib/actions/admin/employees";

export function EmployeeStatusButton({
  employeeId,
  fullName,
  isActive,
}: {
  employeeId: string;
  fullName: string;
  isActive: boolean;
}) {
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
