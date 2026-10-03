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
  isValidDateString,
  todayInTimezone,
} from "@/lib/helpers/dates";
import type { TeamMemberReport } from "@/types/team";
import { DateNav } from "@/components/shared/date-nav";
import { PageHeader } from "@/components/shared/page-header";
import { TeamReportsView } from "@/components/manager/team-reports-view";
import { Separator } from "@/components/ui/separator";

function submittedAside(members: { report: unknown }[]) {
  const submitted = members.filter((member) => member.report).length;
  const total = members.length;
  const pct = total === 0 ? 0 : Math.round((submitted / total) * 100);
  const color =
    pct >= 80
      ? "text-primary"
      : pct >= 50
        ? "text-yellow-500/70"
        : "text-destructive";

  return (
    <span className={`shrink-0 text-sm font-medium ${color}`}>
      {submitted}/{total} submitted
    </span>
  );
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

  const isDeptManager =
    profile?.role === "manager" && deptMembers.length > 0;
  const deptMemberIds = new Set(
    deptMembers.map((member) => member.employeeId),
  );
  const exclusiveSupervisees = superviseeReports.filter(
    (member) => !deptMemberIds.has(member.employeeId),
  );

  const section1Label = isDeptManager
    ? profile?.department_names.join(", ") || "Your Team"
    : "Reporting to You";
  const section1Members = isDeptManager ? deptMembers : superviseeReports;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team Reports"
        action={
          <DateNav
            date={date}
            baseHref="/manager/team-reports"
            label={formatDate(date)}
            timezone={settings.timezone}
          />
        }
      />

      <div>
        <h2 className="mb-3 hidden text-sm font-medium text-muted-foreground md:block">
          {section1Label}
        </h2>
        <TeamReportsView
          members={section1Members}
          deadline={getDeadlineContext(settings)}
          emptyMessage={
            isDeptManager
              ? "No team members yet."
              : "No one is reporting to you yet."
          }
          templates={templates}
          reportDate={date}
          viewerRole={profile?.role}
          currentUserId={profile?.id}
          groupTitle={section1Label}
          groupAside={submittedAside(section1Members)}
        />
      </div>

      {isDeptManager && exclusiveSupervisees.length > 0 && (
        <>
          <Separator className="my-6" />
          <div>
            <h2 className="mb-3 hidden text-sm font-medium text-muted-foreground md:block">
              Also Reporting to You
            </h2>
            <TeamReportsView
              members={exclusiveSupervisees}
              deadline={getDeadlineContext(settings)}
              emptyMessage="No supervisees to show."
              templates={templates}
              reportDate={date}
              viewerRole={profile?.role}
              currentUserId={profile?.id}
              groupTitle="Also Reporting to You"
              groupAside={submittedAside(exclusiveSupervisees)}
            />
          </div>
        </>
      )}
    </div>
  );
}
