import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { InvitationList } from "@/components/admin/invitation-list";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";

export default async function InvitationsPage() {
  const employees = await getAllEmployees();

  const pending = employees.filter(
    (employee) => employee.status === "invited" || employee.status === "pending"
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Invitations</h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} pending{" "}
            {pending.length === 1 ? "invitation" : "invitations"}
          </p>
        </div>
        <InviteEmployeeDialog />
      </div>

      <InvitationList invitations={pending} />
    </div>
  );
}
