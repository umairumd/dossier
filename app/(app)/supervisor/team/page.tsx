import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  getSupervisedMembers,
  getSupervisedMissingToday,
  getSupervisedReportsForDate,
} from "@/lib/supabase/queries/supervisor/team";
import { todayDateString } from "@/lib/helpers/dates";
import { DateFilter } from "@/components/manager/date-filter";
import { MissingReportsTable } from "@/components/manager/missing-reports-table";
import { TeamReportsView } from "@/components/manager/team-reports-view";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SupervisorTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? todayDateString();

  const [members, missing, roster, settings] = await Promise.all([
    getSupervisedReportsForDate(date),
    getSupervisedMissingToday(),
    getSupervisedMembers(),
    getOrganizationSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My Team</h1>
          <p className="text-sm text-muted-foreground">
            Reports from people who report to you.
          </p>
        </div>
        <DateFilter date={date} pathname="/supervisor/team" />
      </div>

      <TeamReportsView
        members={members}
        departmentName="My Team"
        deadlineHourUtc={settings.reportDeadlineHourUtc}
      />

      <Card>
        <CardHeader>
          <CardTitle>Not submitted today</CardTitle>
        </CardHeader>
        <CardContent>
          <MissingReportsTable
            rows={missing}
            departmentName="My Team"
            teamSize={roster.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}
