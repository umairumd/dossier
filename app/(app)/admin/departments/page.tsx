import {
  getAllDepartments,
  getManagerCandidates,
} from "@/lib/supabase/queries/admin/departments";
import { CreateDepartmentDialog } from "@/components/admin/create-department-dialog";
import { DepartmentList } from "@/components/admin/department-list";
import { PageHeader } from "@/components/shared/page-header";

export default async function AdminDepartmentsPage() {
  const [departments, managerCandidates] = await Promise.all([
    getAllDepartments(),
    getManagerCandidates(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Departments"
        count={departments.length}
        countLabel={departments.length === 1 ? "department" : "departments"}
        action={<CreateDepartmentDialog />}
      />

      <DepartmentList
        departments={departments}
        managerCandidates={managerCandidates}
      />
    </div>
  );
}
