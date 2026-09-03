import { getOrgReportsForDate } from "@/lib/supabase/queries/admin/org-reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { formatDate, todayDateString } from "@/lib/helpers/dates";
import { DateNav } from "@/components/shared/date-nav";
import { OrgDailyReports } from "@/components/admin/org-daily-reports";

export default async function OrgReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = todayDateString();
  const date = dateParam ?? today;

  const [{ members, departments }, settings] = await Promise.all([
    getOrgReportsForDate(date),
    getOrganizationSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Daily Reports
        </h1>
        <DateNav
          date={date}
          baseHref="/admin/org-reports"
          label={formatDate(date)}
        />
      </div>

      <OrgDailyReports
        members={members}
        departments={departments}
        deadlineHourUtc={settings.reportDeadlineHourUtc}
      />
    </div>
  );
}
