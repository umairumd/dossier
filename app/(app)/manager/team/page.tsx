import { getTeamEmployeeRoster } from "@/lib/supabase/queries/manager/team";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { Card, CardContent } from "@/components/ui/card";

export default async function TeamMembersPage() {
  const roster = await getTeamEmployeeRoster();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Team Members
        </h1>
        <p className="text-sm text-muted-foreground">
          {roster.length} {roster.length === 1 ? "member" : "members"}
        </p>
      </div>

      {roster.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No employees are assigned to your department yet.
        </p>
      ) : (
        <Card>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {roster.map((member) => (
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
      )}
    </div>
  );
}
