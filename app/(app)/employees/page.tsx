import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import {
  getAllEmployees,
  getEmployeeLastSeen,
} from "@/lib/supabase/queries/admin/employees";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import { EmployeeList } from "@/components/admin/employee-list";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { PageHeader } from "@/components/shared/page-header";

export default async function EmployeesPage() {
  const [employees, profile, allDepartments, orgName, templates] =
    await Promise.all([
      getAllEmployees(),
      getCurrentProfile(),
      getAllDepartments(),
      getOrganizationName(),
      getOrgTemplates(),
    ]);

  const lastSeenByEmployeeId = await getEmployeeLastSeen(
    employees.map((employee) => employee.id),
  );

  const departments = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({
      id: department.id,
      name: department.name,
      manager_name: department.manager_name,
      template_id: department.template_id,
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employees"
        count={employees.length}
        countLabel={employees.length === 1 ? "employee" : "employees"}
        action={
          <InviteEmployeeDialog
            departments={departments}
            candidates={employees}
            orgName={orgName}
          />
        }
      />

      <EmployeeList
        employees={employees}
        currentUserId={profile?.id ?? ""}
        departments={departments}
        candidates={employees}
        lastSeenByEmployeeId={lastSeenByEmployeeId}
        templates={templates}
      />
    </div>
  );
}
