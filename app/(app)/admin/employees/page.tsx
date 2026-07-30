import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { EmployeeList } from "@/components/admin/employee-list";
import { InviteEmployeeSheet } from "@/components/admin/invite-employee-sheet";

export default async function AdminEmployeesPage() {
  const [employees, departments] = await Promise.all([
    getAllEmployees(),
    getAllDepartments(),
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
        <InviteEmployeeSheet departments={departmentOptions} />
      </div>

      <EmployeeList employees={employees} departments={departmentOptions} />
    </div>
  );
}
