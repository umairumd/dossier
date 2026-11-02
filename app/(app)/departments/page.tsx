import {
  getAllDepartments,
  getManagerCandidates,
} from "@/lib/supabase/queries/admin/departments";
import { getDeptCompletionToday } from "@/lib/supabase/queries/admin/dept-completion";
import { CreateDepartmentDialog } from "@/components/admin/create-department-dialog";
import { DepartmentList } from "@/components/admin/department-list";
import { PageHeader } from "@/components/shared/page-header";

export default async function DepartmentsPage() {
  const [departments, managerCandidates, completion] = await Promise.all([
    getAllDepartments(),
    getManagerCandidates(),
    getDeptCompletionToday(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Departments"
        description={(() => {
          const active = departments.filter((department) => !department.archived_at);
          const people = active.reduce((sum, department) => sum + department.employee_count, 0);
          return `${active.length} ${active.length === 1 ? "department" : "departments"} · ${people} ${people === 1 ? "person" : "people"} assigned`;
        })()}
        action={<CreateDepartmentDialog />}
      />

      <DepartmentList
        departments={departments}
        managerCandidates={managerCandidates}
        completion={Object.fromEntries(
          completion.map((row) => [row.departmentId, { submitted: row.submitted, total: row.total }]),
        )}
      />
    </div>
  );
}
