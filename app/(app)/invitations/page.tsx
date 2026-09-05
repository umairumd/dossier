import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { InvitationList } from "@/components/admin/invitation-list";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { PageHeader } from "@/components/shared/page-header";

export default async function InvitationsPage() {
  const [employees, allDepartments, orgName, profile] = await Promise.all([
    getAllEmployees(),
    getAllDepartments(),
    getOrganizationName(),
    getCurrentProfile(),
  ]);

  const pending = employees.filter((employee) => employee.status === "invited");

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
            orgName={orgName}
          />
        }
      />

      <InvitationList
        invitations={pending}
        currentUserId={profile?.id ?? ""}
      />
    </div>
  );
}
