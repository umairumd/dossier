import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import {
  getTeamRoster,
  type TeamRosterMember,
} from "@/lib/supabase/queries/manager/team";
import { getTeamInsights } from "@/lib/supabase/queries/manager/insights";
import { getSupervisedMembers } from "@/lib/supabase/queries/supervisor/team";
import { createClient } from "@/lib/supabase/server";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import {
  getOrganizationSettings,
} from "@/lib/supabase/queries/organization-settings";
import { isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { TeamMemberCard } from "@/components/manager/team-member-card";
import { DeptTemplateActions } from "@/components/admin/dept-template-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";

type MemberCardStats = {
  streak: number;
  submissionRate: number;
  submissionDetail: string;
  lastSubmittedDaysAgo: string | null;
};

function daysAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const submitted = new Date(`${dateStr}T00:00:00Z`);
  const diffMs = today.getTime() - submitted.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function MemberGrid({
  members,
  emptyMessage,
  managerIds,
  memberStatsMap,
}: {
  members: TeamRosterMember[];
  emptyMessage: string;
  managerIds?: Set<string>;
  memberStatsMap: Map<string, MemberCardStats>;
}) {
  if (members.length === 0) {
    return <EmptyState illustration="team" title={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <TeamMemberCard
          key={member.id}
          member={member}
          isManager={managerIds?.has(member.id) ?? false}
          stats={memberStatsMap.get(member.id)}
        />
      ))}
    </div>
  );
}

export default async function TeamMembersPage() {
  const profile = await getCurrentProfileWithDepartment();

  const [deptMembers, supervisedMembers, templates, insights, settings] =
    await Promise.all([
      profile?.role === "manager" ? getTeamRoster() : Promise.resolve([]),
      profile?.is_supervisor
        ? getSupervisedMembers()
        : Promise.resolve([]),
      getOrgTemplates(),
      getTeamInsights().catch(() => null),
      getOrganizationSettings(),
    ]);

  const today = todayInTimezone(settings.timezone);
  const [year, month, todayDay] = today.split("-").map(Number);
  let workingDaysThisMonth = 0;
  for (let day = 1; day <= todayDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isWorkingDay(dateStr, settings.workingDays)) workingDaysThisMonth++;
  }

  const memberStatsMap = new Map(
    (insights?.memberStandings ?? []).map((standing) => [
      standing.employeeId,
      {
        streak: standing.streak,
        submissionRate:
          workingDaysThisMonth === 0
            ? 0
            : Math.round(
                (standing.reportsThisMonth / workingDaysThisMonth) * 100,
              ),
        submissionDetail: `${standing.reportsThisMonth} of ${workingDaysThisMonth} days`,
        lastSubmittedDaysAgo: daysAgo(standing.lastSubmittedDate),
      },
    ]),
  );

  const managerIds = new Set<string>();
  let managedDepartment: {
    id: string;
    name: string;
    template_id: string | null;
  } | null = null;

  if (profile && profile.department_ids.length > 0) {
    const supabase = await createClient();
    const { data: departments } = await supabase
      .from("departments")
      .select("id, manager_id, name, template_id")
      .in("id", profile.department_ids);

    for (const department of departments ?? []) {
      if (department.manager_id) {
        managerIds.add(department.manager_id);
      }
      if (department.manager_id === profile.id) {
        managedDepartment = {
          id: department.id,
          name: department.name,
          template_id: department.template_id,
        };
      }
    }
  }

  const canAssignDeptTemplate = Boolean(
    profile &&
      profile.department_ids.length > 0 &&
      managerIds.has(profile.id) &&
      managedDepartment,
  );

  const isDeptManager =
    profile?.role === "manager" && deptMembers.length > 0;
  const deptMemberIds = new Set(deptMembers.map((member) => member.id));
  const exclusiveSupervisees = supervisedMembers.filter(
    (member) => !deptMemberIds.has(member.id),
  );
  const uniqueCount = new Set([
    ...deptMembers.map((member) => member.id),
    ...supervisedMembers.map((member) => member.id),
  ]).size;

  const section1Label = isDeptManager
    ? profile?.department_names.join(", ") || "Your Team"
    : "Reporting to You";
  const section1Members = isDeptManager ? deptMembers : supervisedMembers;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team Members"
        count={uniqueCount}
        countLabel={uniqueCount === 1 ? "member" : "members"}
        action={
          canAssignDeptTemplate && managedDepartment ? (
            <DeptTemplateActions
              departmentId={managedDepartment.id}
              departmentName={managedDepartment.name}
              currentTemplateId={managedDepartment.template_id}
              templates={templates}
              canCreate
            />
          ) : undefined
        }
      />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {section1Label}
        </h2>
        <MemberGrid
          members={section1Members}
          emptyMessage="No team members assigned yet."
          managerIds={isDeptManager ? managerIds : undefined}
          memberStatsMap={memberStatsMap}
        />
      </div>

      {isDeptManager && exclusiveSupervisees.length > 0 && (
        <>
          <Separator className="my-6" />
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Also Reporting to You
            </h2>
            <MemberGrid
              members={exclusiveSupervisees}
              emptyMessage="No supervisees to show."
              memberStatsMap={memberStatsMap}
            />
          </div>
        </>
      )}
    </div>
  );
}
