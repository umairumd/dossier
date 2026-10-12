import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import {
  getTeamRoster,
  type TeamRosterMember,
} from "@/lib/supabase/queries/manager/team";
import { getTeamInsights } from "@/lib/supabase/queries/manager/insights";
import { getSupervisedMembers } from "@/lib/supabase/queries/supervisor/team";
import { createClient } from "@/lib/supabase/server";
import { TeamMemberCard } from "@/components/manager/team-member-card";
import { EmptyState } from "@/components/shared/empty-state";
import { GroupHeading } from "@/components/shared/person-card";
import { PageHeader } from "@/components/shared/page-header";
import { formatDaysAgoShort, todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";

type MemberCardStats = {
  streak: number;
  submissionRate: number;
  submissionDetail: string;
  lastSubmittedDaysAgo: string | null;
  lastSubmittedDate: string | null;
};

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

  const [deptMembers, supervisedMembers, insights, settings] = await Promise.all([
    profile?.role === "manager" ? getTeamRoster() : Promise.resolve([]),
    profile?.is_supervisor ? getSupervisedMembers() : Promise.resolve([]),
    getTeamInsights().catch(() => null),
    getOrganizationSettings(),
  ]);

  const memberStatsMap = new Map(
    (insights?.memberStandings ?? []).map((standing) => [
      standing.employeeId,
      {
        streak: standing.streak,
        submissionRate: standing.submissionRate,
        submissionDetail: `${standing.reportsSubmitted} of ${standing.expectedWorkingDays} days`,
        lastSubmittedDaysAgo: formatDaysAgoShort(standing.lastSubmittedDate, todayInTimezone(settings.timezone)),
        lastSubmittedDate: standing.lastSubmittedDate,
      },
    ]),
  );

  const managerIds = new Set<string>();

  if (profile && profile.department_ids.length > 0) {
    const supabase = await createClient();
    const { data: departments } = await supabase
      .from("departments")
      .select("id, manager_id")
      .in("id", profile.department_ids);

    for (const department of departments ?? []) {
      if (department.manager_id) {
        managerIds.add(department.manager_id);
      }
    }
  }

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
    ? profile?.department_names.join(", ") || "Your team"
    : "Reporting to you";
  const section1Members = isDeptManager ? deptMembers : supervisedMembers;

  const twoGroups = isDeptManager && exclusiveSupervisees.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team Members"
        description={`${twoGroups ? "" : `${section1Label} · `}${uniqueCount} ${uniqueCount === 1 ? "person" : "people"}`}
      />

      <section>
        {twoGroups && <GroupHeading label={section1Label} count={section1Members.length} />}
        <MemberGrid
          members={section1Members}
          emptyMessage="No team members assigned yet."
          managerIds={isDeptManager ? managerIds : undefined}
          memberStatsMap={memberStatsMap}
        />
      </section>

      {twoGroups && (
        <section className="mt-2">
          <GroupHeading label="Also reporting to you" count={exclusiveSupervisees.length} />
          <MemberGrid
            members={exclusiveSupervisees}
            emptyMessage="No supervisees to show."
            memberStatsMap={memberStatsMap}
          />
        </section>
      )}
    </div>
  );
}
