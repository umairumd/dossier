import { getOrgReportsForDate } from "@/lib/supabase/queries/admin/org-reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { formatDate, todayDateString } from "@/lib/helpers/dates";
import { DateFilter } from "@/components/manager/date-filter";
import { TeamReportsView } from "@/components/manager/team-reports-view";

export default async function OrgReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? todayDateString();

  const [members, settings] = await Promise.all([
    getOrgReportsForDate(date),
    getOrganizationSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Org Reports
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
        </div>
        <DateFilter date={date} pathname="/admin/org-reports" />
      </div>

      <TeamReportsView
        members={members}
        departmentName="Organization"
        deadlineHourUtc={settings.reportDeadlineHourUtc}
        adminView
        emptyMessage={
          members.length === 0
            ? "No employees in the organization yet."
            : "No reports match your filters."
        }
      />
    </div>
  );
}
