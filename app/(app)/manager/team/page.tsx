import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { getTeamEmployeeRoster } from "@/lib/supabase/queries/manager/team";
import { getSupervisedMembers } from "@/lib/supabase/queries/supervisor/team";
import { createClient } from "@/lib/supabase/server";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";

function MemberList({
  members,
  emptyMessage,
  managerIds,
}: {
  members: { id: string; full_name: string }[];
  emptyMessage: string;
  managerIds?: Set<string>;
}) {
  if (members.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Card>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center py-2.5 first:pt-0 last:pb-0"
            >
              <EmployeeNameLink
                employeeId={member.id}
                fullName={member.full_name}
                className="text-sm font-medium hover:underline"
              />
              {managerIds?.has(member.id) && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Manager
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function TeamMembersPage() {
  const profile = await getCurrentProfileWithDepartment();

  const [deptMembers, supervisedMembers] = await Promise.all([
    profile?.role === "manager"
      ? getTeamEmployeeRoster()
      : Promise.resolve([]),
    profile?.is_supervisor
      ? getSupervisedMembers()
      : Promise.resolve([]),
  ]);

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
    ? profile?.department_names.join(", ") || "Your Team"
    : "Reporting to You";
  const section1Members = isDeptManager ? deptMembers : supervisedMembers;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team Members"
        count={uniqueCount}
        countLabel={uniqueCount === 1 ? "member" : "members"}
      />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {section1Label}
        </h2>
        <MemberList
          members={section1Members}
          emptyMessage="No team members assigned yet."
          managerIds={isDeptManager ? managerIds : undefined}
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
            />
          </div>
        </>
      )}
    </div>
  );
}
