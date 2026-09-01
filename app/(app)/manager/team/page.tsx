import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { getTeamEmployeeRoster } from "@/lib/supabase/queries/manager/team";
import { getSupervisedMembers } from "@/lib/supabase/queries/supervisor/team";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function MemberList({
  members,
  emptyMessage,
}: {
  members: { id: string; full_name: string }[];
  emptyMessage: string;
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
            <li key={member.id} className="py-2.5 first:pt-0 last:pb-0">
              <EmployeeNameLink
                employeeId={member.id}
                fullName={member.full_name}
                className="text-sm font-medium hover:underline"
              />
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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Team Members
        </h1>
        <p className="text-sm text-muted-foreground">
          {uniqueCount} {uniqueCount === 1 ? "member" : "members"}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {section1Label}
        </h2>
        <MemberList
          members={section1Members}
          emptyMessage="No team members assigned yet."
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
