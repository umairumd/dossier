import { getOrgReportsForDate } from "@/lib/supabase/queries/admin/org-reports";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getOrgTemplatesWithFields } from "@/lib/supabase/queries/templates";
import { formatDate, todayInTimezone } from "@/lib/helpers/dates";
import { DateNav } from "@/components/shared/date-nav";
import { OrgDailyReports } from "@/components/admin/org-daily-reports";

export default async function TrackReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const date = dateParam ?? today;

  const [{ members, departments }, templates] = await Promise.all([
    getOrgReportsForDate(date),
    getOrgTemplatesWithFields(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Track Reports
        </h1>
        <DateNav
          date={date}
          baseHref="/track-reports"
          label={formatDate(date)}
          timezone={settings.timezone}
        />
      </div>

      <OrgDailyReports
        members={members}
        departments={departments}
        deadline={getDeadlineContext(settings)}
        templates={templates}
      />
    </div>
  );
}
