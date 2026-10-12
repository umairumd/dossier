import { redirect } from "next/navigation";
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
  const profile = await getCurrentProfile();

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    redirect("/team");
  }

  // Last-seen needs the employee ids, so it chains off the list inside the
  // same Promise.all instead of waiting for every other read.
  const employeesP = getAllEmployees();
  const [employees, allDepartments, orgName, templates, lastSeenByEmployeeId] =
    await Promise.all([
      employeesP,
      getAllDepartments(),
      getOrganizationName(),
      getOrgTemplates(),
      employeesP.then((list) => getEmployeeLastSeen(list.map((employee) => employee.id))),
    ]);

  const departments = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({
      id: department.id,
      name: department.name,
      manager_id: department.manager_id,
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
        description={(() => {
          const current = employees.filter((employee) => employee.status !== "archived").length;
          return `${current} ${current === 1 ? "person" : "people"} · ${departments.length} ${departments.length === 1 ? "department" : "departments"}`;
        })()}
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
