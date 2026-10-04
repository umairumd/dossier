import { getOrgReportsForDate } from "@/lib/supabase/queries/admin/org-reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getOrgTemplatesWithFields } from "@/lib/supabase/queries/templates";
import {
  formatDate,
  isValidDateString,
  isWorkingDay,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { DateNav } from "@/components/shared/date-nav";
import { PageHeader } from "@/components/shared/page-header";
import { OrgDailyReports } from "@/components/admin/org-daily-reports";

export default async function TrackReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const date = isValidDateString(dateParam) ? dateParam : today;
  const isOrgOffDay =
    settings.workingDays.length > 0 &&
    !isWorkingDay(date, settings.workingDays);

  const [{ members, departments }, templates, profile] = await Promise.all([
    getOrgReportsForDate(date),
    getOrgTemplatesWithFields(),
    getCurrentProfile(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Track Reports"
        action={
          <DateNav
            date={date}
            baseHref="/track-reports"
            label={formatDate(date)}
            timezone={settings.timezone}
          />
        }
      />

      {isOrgOffDay && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {formatDate(date)} is a non-working day. Only voluntary submissions
          are shown.
        </div>
      )}

      <OrgDailyReports
        members={members}
        departments={departments}
        deadline={getDeadlineContext(settings)}
        templates={templates}
        reportDate={date}
        viewerRole={profile?.role}
        currentUserId={profile?.id}
      />
    </div>
  );
}
