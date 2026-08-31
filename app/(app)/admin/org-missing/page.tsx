import { getOrgMissingReportsToday, getOrgTeamSize } from "@/lib/supabase/queries/admin/org-missing";
import { MissingReportsTable } from "@/components/manager/missing-reports-table";

export default async function OrgMissingReportsPage() {
  const [rows, teamSize] = await Promise.all([
    getOrgMissingReportsToday(),
    getOrgTeamSize(),
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
        departmentName="Organization"
        teamSize={teamSize}
        basePath="/admin/employees"
        emptyTeamMessage="No employees in the organization yet."
      />
    </div>
  );
}
