"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { permanentlyDeleteEmployee } from "@/lib/actions/admin/employees";

// Only ever rendered for already-archived employees (see EmployeeList /
// employee detail page) — the action itself also re-checks archived_at
// server-side, so this isn't the only thing enforcing it.
//
// redirectTo: pass this from the employee's own detail page, since that
// record ceases to exist the moment this succeeds — staying put would
// show a stale/deleted record. List callers omit it: a row disappearing
// from an otherwise-still-valid list needs no navigation, just the
// existing revalidatePath.
export function PermanentlyDeleteEmployeeButton({
  employeeId,
  fullName,
  redirectTo,
}: {
  employeeId: string;
  fullName: string;
  redirectTo?: string;
}) {
  const router = useRouter();

  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="destructive" size="sm">
          <Trash2 />
          Delete Permanently
        </Button>
      }
      title="Permanently delete this employee?"
      description={`This removes ${fullName}'s account and every report they've ever submitted. This cannot be undone, and their email address will become available to invite again.`}
      confirmLabel="Delete Permanently"
      confirmVariant="destructive"
      successMessage="Employee permanently deleted."
      errorMessage="Couldn't permanently delete employee."
      action={() => permanentlyDeleteEmployee(employeeId)}
      onSuccess={redirectTo ? () => router.push(redirectTo) : undefined}
    />
  );
}
