import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import {
  getTeamRoster,
  type TeamRosterMember,
} from "@/lib/supabase/queries/manager/team";
import { getSupervisedMembers } from "@/lib/supabase/queries/supervisor/team";
import { createClient } from "@/lib/supabase/server";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import { TeamMemberRow } from "@/components/manager/team-member-row";
import { DeptTemplateActions } from "@/components/admin/dept-template-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import type { ReportTemplate } from "@/types/template";

function MemberList({
  members,
  emptyMessage,
  managerIds,
  templates,
}: {
  members: TeamRosterMember[];
  emptyMessage: string;
  managerIds?: Set<string>;
  templates: ReportTemplate[];
}) {
  if (members.length === 0) {
    return <EmptyState illustration="team" title={emptyMessage} />;
  }

  return (
    <Card>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              managerId={managerIds?.has(member.id) ? member.id : null}
              templates={templates}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function TeamMembersPage() {
  const profile = await getCurrentProfileWithDepartment();

  const [deptMembers, supervisedMembers, templates] = await Promise.all([
    profile?.role === "manager"
      ? getTeamRoster()
      : Promise.resolve([]),
    profile?.is_supervisor
      ? getSupervisedMembers()
      : Promise.resolve([]),
    getOrgTemplates(),
  ]);

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
            />
          ) : undefined
        }
      />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {section1Label}
        </h2>
        <MemberList
          members={section1Members}
          emptyMessage="No team members assigned yet."
          managerIds={isDeptManager ? managerIds : undefined}
          templates={templates}
        />
      </div>

      {isDeptManager && exclusiveSupervisees.length > 0 && (
        <>
          <Separator className="my-6" />
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Also Reporting to You
            </h2>
            <MemberList
              members={exclusiveSupervisees}
              emptyMessage="No supervisees to show."
              templates={templates}
            />
          </div>
        </>
      )}
    </div>
  );
}
