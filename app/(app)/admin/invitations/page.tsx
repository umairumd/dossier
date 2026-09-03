import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { InvitationList } from "@/components/admin/invitation-list";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { PageHeader } from "@/components/shared/page-header";

export default async function InvitationsPage() {
  const employees = await getAllEmployees();

  const pending = employees.filter(
    (employee) => employee.status === "invited" || employee.status === "pending"
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invitations"
        count={pending.length}
        countLabel={
          pending.length === 1 ? "pending invitation" : "pending invitations"
        }
        action={<InviteEmployeeDialog />}
      />

      <InvitationList invitations={pending} />
    </div>
  );
}
