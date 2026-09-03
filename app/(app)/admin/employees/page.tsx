import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { EmployeeList } from "@/components/admin/employee-list";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { PageHeader } from "@/components/shared/page-header";

export default async function AdminEmployeesPage() {
  const [employees, profile, allDepartments] = await Promise.all([
    getAllEmployees(),
    getCurrentProfile(),
    getAllDepartments(),
  ]);

  const departments = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({ id: department.id, name: department.name }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employees"
        count={employees.length}
        countLabel={employees.length === 1 ? "employee" : "employees"}
        action={<InviteEmployeeDialog />}
      />

      <EmployeeList
        employees={employees}
        currentUserId={profile?.id ?? ""}
        departments={departments}
        candidates={employees}
      />
    </div>
  );
}
