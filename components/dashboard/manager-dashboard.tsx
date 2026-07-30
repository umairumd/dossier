import { Building2 } from "lucide-react";
import { getManagerTeamReports } from "@/lib/supabase/queries/team";
import type { ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { formatLongDate } from "@/lib/helpers/dates";
import { Badge } from "@/components/ui/badge";
import { ManagerSummaryCards } from "@/components/manager/manager-summary-cards";
import { TeamReportList } from "@/components/manager/team-report-list";

export async function ManagerDashboard({
  profile,
}: {
  profile: ProfileWithDepartment;
}) {
  const members = await getManagerTeamReports();
  const totalEmployees = members.length;
  const submittedToday = members.filter((member) => member.report).length;
  const missingToday = totalEmployees - submittedToday;
  const today = formatLongDate(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.department?.name ?? "Team"} Dashboard
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{today}</span>
          <Badge variant="outline">
            <Building2 />
            {profile.department?.name ?? "Unassigned"}
          </Badge>
        </div>
      </div>

      <ManagerSummaryCards
        totalEmployees={totalEmployees}
        submittedToday={submittedToday}
        missingToday={missingToday}
      />

      <TeamReportList members={members} />
    </div>
  );
}
