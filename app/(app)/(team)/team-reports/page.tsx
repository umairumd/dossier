import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import {
  getTeamReportsForDate,
  type TeamRosterMember,
} from "@/lib/supabase/queries/manager/team";
import {
  getSupervisedMembers,
  getSupervisedReportsForDate,
} from "@/lib/supabase/queries/supervisor/team";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getOrgTemplatesWithFields } from "@/lib/supabase/queries/templates";
import {
  formatDate,
  formatHourLabel,
  isValidDateString,
  isWorkingDay,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { isAttendanceExempt } from "@/lib/helpers/report-stats";
import type { TeamMemberReport } from "@/types/team";
import { DateNav } from "@/components/shared/date-nav";
import { PageHeader } from "@/components/shared/page-header";
import { TeamReportsView } from "@/components/manager/team-reports-view";

function countIn(members: TeamMemberReport[], reportDate: string, workingDays: number[]) {
  const isOrgOffDay =
    workingDays.length > 0 && !isWorkingDay(reportDate, workingDays);
  if (isOrgOffDay) {
    const submitted = members.filter((member) => member.report != null).length;
    return { submitted, total: submitted };
  }
  const countable = members.filter(
    (member) => !(isAttendanceExempt(member.attendanceStatus) && !member.report),
  );
  return {
    submitted: countable.filter((member) => member.report != null).length,
    total: countable.length,
  };
}

export default async function TeamReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const profile = await getCurrentProfileWithDepartment();
  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const date = isValidDateString(dateParam) ? dateParam : today;

  const [deptMembers, supervised, templates] = await Promise.all([
    profile?.role === "manager"
      ? getTeamReportsForDate(date)
      : Promise.resolve([]),
    profile?.is_supervisor
      ? Promise.all([
          getSupervisedReportsForDate(date),
          getSupervisedMembers(),
        ])
      : Promise.resolve([[], []] as [TeamMemberReport[], TeamRosterMember[]]),
    getOrgTemplatesWithFields(),
  ]);

  const [superviseeReports] = supervised;

  // Off-day awareness: today's view shows "Day Off" not "Missed" for non-working days.
  const isOffDay =
    date === today && !isWorkingDay(today, settings.workingDays);
  // Date nav / banner: any non-working calendar day for the selected date.
  const isOrgOffDay =
    settings.workingDays.length > 0 && !isWorkingDay(date, settings.workingDays);

  const isDeptManager =
    profile?.role === "manager" && deptMembers.length > 0;
  const deptMemberIds = new Set(
    deptMembers.map((member) => member.employeeId),
  );
  const exclusiveSupervisees = superviseeReports.filter(
    (member) => !deptMemberIds.has(member.employeeId),
  );

  const section1Label = isDeptManager
    ? profile?.department_names.join(", ") || "Your team"
    : "Reporting to you";
  const section1Members = isDeptManager ? deptMembers : superviseeReports;
  const groups = [
    { key: "main", title: section1Label, members: section1Members },
    ...(isDeptManager && exclusiveSupervisees.length > 0
      ? [{ key: "also", title: "Also reporting to you", members: exclusiveSupervisees }]
      : []),
  ];
  const everyone = groups.flatMap((group) => group.members);
  const { submitted, total } = countIn(everyone, date, settings.workingDays);

  const deadline = getDeadlineContext(settings);
  // At most one middle dot: who, then today's numbers.
  const counts = [
    `${total} ${total === 1 ? "person" : "people"}`,
    `${submitted} in`,
    isOrgOffDay ? null : `due ${formatHourLabel(settings.reportDeadlineHourLocal)}`,
  ]
    .filter(Boolean)
    .join(", ");
  const description = groups.length === 1 ? `${section1Label} · ${counts}` : counts;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team Reports"
        description={description}
        action={
          <DateNav
            date={date}
            baseHref="/team-reports"
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

      <TeamReportsView
        groups={groups}
        deadline={deadline}
        emptyMessage={
          isDeptManager ? "No team members yet." : "No one is reporting to you yet."
        }
        templates={templates}
        reportDate={date}
        viewerRole={profile?.role}
        currentUserId={profile?.id}
        isOffDay={isOffDay}
      />
    </div>
  );
}
