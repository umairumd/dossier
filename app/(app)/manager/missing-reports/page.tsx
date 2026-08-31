import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { getMissingReportsToday } from "@/lib/supabase/queries/manager/missing-reports";
import { MissingReportsTable } from "@/components/manager/missing-reports-table";

export default async function MissingReportsPage() {
  const [profile, rows] = await Promise.all([
    getCurrentProfileWithDepartment(),
    getMissingReportsToday(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Missing Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "employee has" : "employees have"}{" "}
          not submitted today.
        </p>
      </div>

      <MissingReportsTable
        rows={rows}
        departmentName={profile?.department_names[0] ?? "Team"}
      />
    </div>
  );
}
