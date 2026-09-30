import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getDeadlineContext,
  getOrganizationSettings,
} from "@/lib/supabase/queries/organization-settings";
import {
  getAttendanceSettings,
  getMonthAccrualStatus,
  getMonthlyAttendance,
  getRemoteAttendanceDates,
  getTeamMonthlyAttendance,
} from "@/lib/supabase/queries/attendance";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getTeamRoster } from "@/lib/supabase/queries/manager/team";
import { getSupervisedMembers } from "@/lib/supabase/queries/supervisor/team";
import {
  lastDayOfMonth,
  parseYearMonth,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { MonthNav } from "@/components/attendance/month-nav";
import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { AttendanceLegend } from "@/components/attendance/attendance-legend";
import { RunAccrualButton } from "@/components/attendance/run-accrual-button";
import type { AttendanceRecord } from "@/types/attendance";

export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getCurrentProfile();

  const isOwnerOrAdmin =
    profile?.role === "owner" || profile?.role === "admin";
  const isManager = profile?.role === "manager";
  const isSupervisor = Boolean(profile?.is_supervisor);

  if (!profile || (!isOwnerOrAdmin && !isManager && !isSupervisor)) {
    redirect("/");
  }

  const { month: monthParam } = await searchParams;
  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const currentMonth = today.slice(0, 7); // "YYYY-MM"
  const month = parseYearMonth(monthParam) ?? currentMonth;

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
    leave_balance: number;
    joined_on: string | null;
  }[] = [];
  let records: AttendanceRecord[] = [];
  let attendanceSettings: Awaited<ReturnType<typeof getAttendanceSettings>>;
  let accrualDone = false;

  const [yearNum, monthNum] = month.split("-").map(Number);

  if (isOwnerOrAdmin) {
    const [employees, attSettings, monthlyRecords, monthAccrualDone] =
      await Promise.all([
        getAllEmployees(),
        getAttendanceSettings(),
        getMonthlyAttendance(month),
        getMonthAccrualStatus(yearNum, monthNum),
      ]);

    attendanceSettings = attSettings;
    records = monthlyRecords;
    accrualDone = monthAccrualDone;
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
        leave_balance: emp.leave_balance,
        joined_on: emp.created_at ? emp.created_at.slice(0, 10) : null,
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
      leave_balance: member.leave_balance,
      joined_on: member.created_at ? member.created_at.slice(0, 10) : null,
    }));
    records = await getTeamMonthlyAttendance(
      month,
      activeEmployees.map((emp) => emp.id),
    );
  }

  const onSiteEmployees = activeEmployees.filter((e) => !e.is_remote);
  const remoteEmployees = activeEmployees.filter((e) => e.is_remote);
  const isCurrentMonth = month === currentMonth;
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);
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
          {isOwnerOrAdmin && isCurrentMonth && (
            <RunAccrualButton yearMonth={month} accrualDone={accrualDone} />
          )}
          <MonthNav month={month} baseHref="/attendance" />
        </div>
      </div>

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
        today={today}
      />
    </div>
  );
}
