import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { InvitationList } from "@/components/admin/invitation-list";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { PageHeader } from "@/components/shared/page-header";

export default async function InvitationsPage() {
  const [employees, allDepartments, orgName] = await Promise.all([
    getAllEmployees(),
    getAllDepartments(),
    getOrganizationName(),
  ]);

  const pending = employees.filter(
    (employee) => employee.status === "invited" || employee.status === "pending"
  );

  const departments = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({
      id: department.id,
      name: department.name,
      manager_name: department.manager_name,
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invitations"
        count={pending.length}
        countLabel={
          pending.length === 1 ? "pending invitation" : "pending invitations"
        }
        action={
          <InviteEmployeeDialog
            departments={departments}
            candidates={employees}
          />
        }
      />

      <InvitationList invitations={pending} orgName={orgName} />
    </div>
  );
}
