import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import {
  getAllEmployees,
  getEmployeeLastSeen,
} from "@/lib/supabase/queries/admin/employees";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import { EmployeesView } from "@/components/admin/employees-view";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { buildOrgTree } from "@/lib/helpers/org-tree";

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

  const { roots, unsupervised } = buildOrgTree(
    employees,
    allDepartments.map((d) => ({
      id: d.id,
      manager_id: d.manager_id ?? null,
    })),
  );

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

      <EmployeesView
        employees={employees}
        currentUserId={profile?.id ?? ""}
        departments={departments}
        candidates={employees}
        lastSeenByEmployeeId={lastSeenByEmployeeId}
        templates={templates}
        roots={roots}
        unsupervised={unsupervised}
      />
    </div>
  );
}
