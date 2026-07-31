import {
  getAllDepartments,
  getManagerCandidates,
} from "@/lib/supabase/queries/admin/departments";
import { CreateDepartmentDialog } from "@/components/admin/create-department-dialog";
import { DepartmentList } from "@/components/admin/department-list";

export default async function AdminDepartmentsPage() {
  const [departments, managerCandidates] = await Promise.all([
    getAllDepartments(),
    getManagerCandidates(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">
            {departments.length}{" "}
            {departments.length === 1 ? "department" : "departments"}
          </p>
        </div>
        <CreateDepartmentDialog />
      </div>

      <DepartmentList
        departments={departments}
        managerCandidates={managerCandidates}
      />
    </div>
  );
}
