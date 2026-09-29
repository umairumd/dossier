import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getDeadlineContext,
  getOrganizationSettings,
} from "@/lib/supabase/queries/organization-settings";
import {
  getAttendanceSettings,
  getMonthlyAttendance,
  getPendingLeaveRequests,
  getRemoteAttendanceDates,
  getTeamMonthlyAttendance,
} from "@/lib/supabase/queries/attendance";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getTeamRoster } from "@/lib/supabase/queries/manager/team";
import { getSupervisedMembers } from "@/lib/supabase/queries/supervisor/team";
import { todayInTimezone } from "@/lib/helpers/dates";
import { MonthNav } from "@/components/attendance/month-nav";
import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { AttendanceLegend } from "@/components/attendance/attendance-legend";
import { LeaveRequestsList } from "@/components/attendance/leave-requests-list";
import { RunAccrualButton } from "@/components/attendance/run-accrual-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { AttendanceRecord } from "@/types/attendance";

export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const profile = await getCurrentProfile();

  const isOwnerOrAdmin =
    profile?.role === "owner" || profile?.role === "admin";
  const isManager = profile?.role === "manager";
  const isSupervisor = Boolean(profile?.is_supervisor);

  if (!profile || (!isOwnerOrAdmin && !isManager && !isSupervisor)) {
    redirect("/");
  }

  const { month: monthParam, tab } = await searchParams;
  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const currentMonth = today.slice(0, 7); // "YYYY-MM"
  const month = monthParam ?? currentMonth;

  const isReadOnly = !isOwnerOrAdmin;
  const orgId = profile.organization_id ?? "";
  const deadline = getDeadlineContext(settings);
  const profileBasePath = isReadOnly ? "/manager/employees" : "/employees";

  let activeEmployees: {
    id: string;
    full_name: string;
    org_id: string;
    is_remote: boolean;
    employment_type: "full_time" | "part_time";
    designation: string | null;
    department_name: string | null;
    avatar_url: string | null;
  }[] = [];
  let records: AttendanceRecord[] = [];
  let leaveRequests: Awaited<ReturnType<typeof getPendingLeaveRequests>> = [];
  let attendanceSettings: Awaited<ReturnType<typeof getAttendanceSettings>>;

  if (isOwnerOrAdmin) {
    const [employees, attSettings, monthlyRecords, pendingLeaves] =
      await Promise.all([
        getAllEmployees(),
        getAttendanceSettings(),
        getMonthlyAttendance(month),
        getPendingLeaveRequests(),
      ]);

    attendanceSettings = attSettings;
    records = monthlyRecords;
    leaveRequests = pendingLeaves;
    activeEmployees = employees
      .filter((emp) => emp.status === "active" || emp.status === "invited")
      .map((emp) => ({
        id: emp.id,
        full_name: emp.full_name,
        org_id: emp.organization_id ?? orgId,
        is_remote: emp.is_remote,
        employment_type: emp.employment_type,
        designation: emp.designation,
        department_name:
          emp.department_names.length > 0
            ? emp.department_names.join(", ")
            : null,
        avatar_url: emp.avatar_url,
      }));
  } else {
    // Managers see department roster; pure supervisors see supervised members.
    const members = isManager
      ? await getTeamRoster()
      : await getSupervisedMembers();

    attendanceSettings = await getAttendanceSettings();
    activeEmployees = members.map((member) => ({
      id: member.id,
      full_name: member.full_name,
      org_id: orgId,
      is_remote: member.is_remote,
      employment_type: member.employment_type,
      designation: member.designation,
      department_name: null,
      avatar_url: member.avatar_url,
    }));
    records = await getTeamMonthlyAttendance(
      month,
      activeEmployees.map((emp) => emp.id),
    );
  }

  const onSiteEmployees = activeEmployees.filter((e) => !e.is_remote);
  const remoteEmployees = activeEmployees.filter((e) => e.is_remote);
  const [yearNum, monthNum] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = new Date(yearNum, monthNum, 0).toISOString().slice(0, 10);
  const remoteReportDates = await getRemoteAttendanceDates(
    remoteEmployees.map((e) => e.id),
    monthStart,
    monthEnd,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>
              {activeEmployees.length} employee
              {activeEmployees.length !== 1 ? "s" : ""}
            </span>
            <AttendanceLegend showHolidayHint={!isReadOnly} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {profile.role === "owner" && <RunAccrualButton />}
          <MonthNav month={month} baseHref="/attendance" />
        </div>
      </div>

      {isOwnerOrAdmin ? (
        <Tabs defaultValue={tab ?? "grid"}>
          <TabsList>
            <TabsTrigger value="grid">Monthly Grid</TabsTrigger>
            <TabsTrigger value="leaves" className="gap-2">
              Leave Requests
              {leaveRequests.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  {leaveRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-4">
            <AttendanceGrid
              onSiteEmployees={onSiteEmployees}
              remoteEmployees={remoteEmployees}
              remoteReportDates={remoteReportDates}
              records={records}
              yearMonth={month}
              settings={attendanceSettings}
              workingDays={settings.workingDays}
              orgId={orgId}
              deadline={deadline}
              profileBasePath={profileBasePath}
              isReadOnly={isReadOnly}
            />
          </TabsContent>

          <TabsContent value="leaves" className="mt-4">
            <Card className="card-gradient">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Pending Leave Requests
                </CardTitle>
                <CardDescription>
                  Requests submitted by employees via email and logged here by
                  HR.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <LeaveRequestsList requests={leaveRequests} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <AttendanceGrid
          onSiteEmployees={onSiteEmployees}
          remoteEmployees={remoteEmployees}
          remoteReportDates={remoteReportDates}
          records={records}
          yearMonth={month}
          settings={attendanceSettings}
          workingDays={settings.workingDays}
          orgId={orgId}
          deadline={deadline}
          profileBasePath={profileBasePath}
          isReadOnly
        />
      )}
    </div>
  );
}
