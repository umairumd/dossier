import Link from "next/link";
import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import {
  getTeamReportsForDate,
  type TeamRosterMember,
} from "@/lib/supabase/queries/manager/team";
import {
  getSupervisedMembers,
  getSupervisedReportsForDate,
} from "@/lib/supabase/queries/supervisor/team";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  formatDate,
  shiftReportDate,
  todayDateString,
} from "@/lib/helpers/dates";
import type { TeamMemberReport } from "@/types/team";
import { TeamReportsView } from "@/components/manager/team-reports-view";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default async function TeamReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = todayDateString();
  const date = dateParam ?? today;
  const isToday = date >= today;
  const previousDate = shiftReportDate(date, -1);
  const nextDate = shiftReportDate(date, 1);

  const profile = await getCurrentProfileWithDepartment();

  const [settings, deptMembers, supervised] = await Promise.all([
    getOrganizationSettings(),
    profile?.role === "manager"
      ? getTeamReportsForDate(date)
      : Promise.resolve([]),
    profile?.is_supervisor
      ? Promise.all([
          getSupervisedReportsForDate(date),
          getSupervisedMembers(),
        ])
      : Promise.resolve([[], []] as [TeamMemberReport[], TeamRosterMember[]]),
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Team Reports
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/manager/team-reports?date=${previousDate}`}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Previous
          </Link>
          <span className="font-medium">{formatDate(date)}</span>
          <Link
            href={`/manager/team-reports?date=${nextDate}`}
            aria-disabled={isToday}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isToday && "pointer-events-none opacity-40",
            )}
          >
            Next →
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {section1Label}
        </h2>
        <TeamReportsView
          members={section1Members}
          departmentName={section1Label}
          deadlineHourUtc={settings.reportDeadlineHourUtc}
          emptyMessage={
            isDeptManager
              ? "No team members yet."
              : "No one is reporting to you yet."
          }
        />
      </div>

      {isDeptManager && exclusiveSupervisees.length > 0 && (
        <>
          <Separator className="my-6" />
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Also Reporting to You
            </h2>
            <TeamReportsView
              members={exclusiveSupervisees}
              departmentName="Also Reporting to You"
              deadlineHourUtc={settings.reportDeadlineHourUtc}
              emptyMessage="No supervisees to show."
            />
          </div>
        </>
      )}
    </div>
  );
}
