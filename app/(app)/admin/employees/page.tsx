import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { EmployeeList } from "@/components/admin/employee-list";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";

export default async function AdminEmployeesPage() {
  const [employees, departments, profile] = await Promise.all([
    getAllEmployees(),
    getAllDepartments(),
    getCurrentProfile(),
  ]);

  const departmentOptions = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Employees
          </h1>
          <p className="text-sm text-muted-foreground">
            {employees.length}{" "}
            {employees.length === 1 ? "employee" : "employees"}
          </p>
        </div>
        <InviteEmployeeDialog departments={departmentOptions} />
      </div>

      <EmployeeList
        employees={employees}
        departments={departmentOptions}
        currentUserId={profile?.id ?? ""}
      />
    </div>
  );
}
