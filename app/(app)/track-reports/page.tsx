import { getOrgReportsForDate } from "@/lib/supabase/queries/admin/org-reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getOrgTemplatesWithFields } from "@/lib/supabase/queries/templates";
import {
  formatDate,
  formatHourLabel,
  isValidDateString,
  isWorkingDay,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { formatInCount, partitionReporters } from "@/lib/helpers/report-stats";
import { DateNav } from "@/components/shared/date-nav";
import { PageHeader } from "@/components/shared/page-header";
import { getCommentsForReports } from "@/lib/supabase/queries/report-comments";
import { getReportDate } from "@/lib/supabase/queries/reports";
import { OrgDailyReports } from "@/components/admin/org-daily-reports";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TrackReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; department?: string; report?: string }>;
}) {
  const [{ date: dateParam, department: departmentParam, report: reportParam }, settings] =
    await Promise.all([searchParams, getOrganizationSettings()]);
  const today = todayInTimezone(settings.timezone);
  // ?report=<id> (from a comment notification) opens that report on its day.
  const openReportId = reportParam && UUID_PATTERN.test(reportParam) ? reportParam : undefined;
  const reportDate = openReportId && !dateParam ? await getReportDate(openReportId) : null;
  const date = isValidDateString(dateParam) ? dateParam : (reportDate ?? today);
  const isOrgOffDay =
    settings.workingDays.length > 0 &&
    !isWorkingDay(date, settings.workingDays);

  // Comments for the day's reports load with the roster, so a report opens
  // with its comments already there.
  const orgReportsP = getOrgReportsForDate(date);
  const [{ members, departments }, templates, profile, comments] = await Promise.all([
    orgReportsP,
    getOrgTemplatesWithFields(),
    getCurrentProfile(),
    orgReportsP.then((r) =>
      getCommentsForReports(r.members.flatMap((m) => (m.report ? [m.report.id] : []))),
    ),
  ]);

  // Off-day: today only (for historical dates the user navigated to, all
  // statuses show correctly regardless).
  const isOffDay =
    date === today && !isWorkingDay(today, settings.workingDays);

  const partition = partitionReporters(
    members.map((member) => ({
      id: member.employeeId,
      hasReport: member.report != null,
      attendanceStatus: member.attendanceStatus ?? null,
    })),
    { orgOffDay: isOrgOffDay },
  );
  const inLabel = formatInCount(
    partition.submitted.length,
    partition.expected,
    partition.away.length,
  );
  // At most one middle dot: who, then today's numbers.
  const description = `${members.length} ${members.length === 1 ? "person" : "people"} in ${departments.length} ${departments.length === 1 ? "department" : "departments"} · ${[
    inLabel,
    isOrgOffDay || partition.expected === 0
      ? null
      : `due ${formatHourLabel(settings.reportDeadlineHourLocal)}`,
  ]
    .filter(Boolean)
    .join(", ")}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Track Reports"
        description={description}
        action={
          <DateNav
            date={date}
            baseHref="/track-reports"
            label={formatDate(date)}
            timezone={settings.timezone}
            isOffDay={isOrgOffDay}
          />
        }
      />

      {isOrgOffDay && (
        <p className="rounded-xl bg-fill-subtle px-4 py-3 text-sm text-muted-foreground ring-1 ring-inset ring-edge">
          {formatDate(date)} is a non-working day. Only voluntary submissions
          are shown.
        </p>
      )}

      <OrgDailyReports
        members={members}
        departments={departments}
        deadline={getDeadlineContext(settings)}
        templates={templates}
        reportDate={date}
        viewerRole={profile?.role}
        currentUserId={profile?.id}
        isOffDay={isOffDay}
        focusDepartmentId={departmentParam}
        comments={comments}
        openReportId={openReportId}
      />
    </div>
  );
}
