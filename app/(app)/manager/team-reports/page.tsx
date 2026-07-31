import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { formatDate, todayDateString } from "@/lib/helpers/dates";
import { DateFilter } from "@/components/manager/date-filter";
import { TeamReportsView } from "@/components/manager/team-reports-view";

export default async function TeamReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? todayDateString();

  const [profile, members, settings] = await Promise.all([
    getCurrentProfileWithDepartment(),
    getTeamReportsForDate(date),
    getOrganizationSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Team Reports
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
        </div>
        <DateFilter date={date} />
      </div>

      <TeamReportsView
        members={members}
        departmentName={profile?.department?.name ?? "Team"}
        deadlineHourUtc={settings.reportDeadlineHourUtc}
      />
    </div>
  );
}
