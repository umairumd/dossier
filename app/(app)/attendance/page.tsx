import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getDeadlineContext,
  getOrganizationSettings,
} from "@/lib/supabase/queries/organization-settings";
import {
  getAttendanceSettings,
  getCurrentShift,
  getMonthAccrualStatus,
  getMonthlyAttendance,
  getMyAttendance,
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
import { PersonalMonthCalendar } from "@/components/attendance/personal-month-calendar";
import { RunAccrualButton } from "@/components/attendance/run-accrual-button";
import { PageHeader } from "@/components/shared/page-header";
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
  const isMember = profile?.role === "member" && !isSupervisor;

  if (
    !profile ||
    (!isOwnerOrAdmin && !isManager && !isSupervisor && !isMember)
  ) {
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
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);
  const isCurrentMonth = month === currentMonth;

  // ── Member: personal calendar only ──────────────────────────────
  if (isMember) {
    const [myRecords, attendanceSettings, myShift] = await Promise.all([
      getMyAttendance(month),
      getAttendanceSettings(),
      getCurrentShift(profile.id),
    ]);

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Attendance"
          action={
            <MonthNav
              month={month}
              baseHref="/attendance"
              currentMonth={currentMonth}
            />
          }
        />

        <PersonalMonthCalendar
          records={myRecords}
          yearMonth={month}
          workingDays={settings.workingDays}
          today={today}
          shift={myShift}
          leaveBalance={undefined}
          fines={undefined}
        />
      </div>
    );
  }

  // ── Manager / supervisor: personal calendar + slim team grid ────
  if (!isOwnerOrAdmin) {
    const members = isManager
      ? await getTeamRoster()
      : await getSupervisedMembers();

    // Exclude self from the team query entirely (not just UI hide).
    const teamMembers = members.filter((member) => member.id !== profile.id);

    const [
      myRecords,
      myShift,
      attendanceSettings,
      teamRecords,
      remoteReportDates,
    ] = await Promise.all([
      getMyAttendance(month),
      getCurrentShift(profile.id),
      getAttendanceSettings(),
      getTeamMonthlyAttendance(
        month,
        teamMembers.map((member) => member.id),
      ),
      getRemoteAttendanceDates(
        teamMembers.filter((m) => m.is_remote).map((m) => m.id),
        monthStart,
        monthEnd,
      ),
    ]);

    const activeEmployees = teamMembers.map((member) => ({
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

    const onSiteEmployees = activeEmployees.filter((e) => !e.is_remote);
    const remoteEmployees = activeEmployees.filter((e) => e.is_remote);

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Attendance"
          count={activeEmployees.length}
          countLabel={
            activeEmployees.length === 1 ? "teammate" : "teammates"
          }
          action={
            <MonthNav
              month={month}
              baseHref="/attendance"
              currentMonth={currentMonth}
            />
          }
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Your attendance
          </h2>
          <PersonalMonthCalendar
            records={myRecords}
            yearMonth={month}
            workingDays={settings.workingDays}
            today={today}
            shift={myShift}
            leaveBalance={undefined}
            fines={undefined}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Your team
          </h2>
          <AttendanceGrid
            onSiteEmployees={onSiteEmployees}
            remoteEmployees={remoteEmployees}
            remoteReportDates={remoteReportDates}
            records={teamRecords}
            yearMonth={month}
            settings={attendanceSettings}
            workingDays={settings.workingDays}
            orgId={orgId}
            deadline={deadline}
            profileBasePath={profileBasePath}
            isReadOnly
            today={today}
            viewerRole={profile.role}
            currentUserId={profile.id}
            showBalanceAndFines={false}
          />
        </section>
      </div>
    );
  }

  // ── Owner / admin: full org grid ────────────────────────────────
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

  const onSiteEmployees = activeEmployees.filter((e) => !e.is_remote);
  const remoteEmployees = activeEmployees.filter((e) => e.is_remote);
  const remoteReportDates = await getRemoteAttendanceDates(
    remoteEmployees.map((e) => e.id),
    monthStart,
    monthEnd,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        count={activeEmployees.length}
        countLabel={activeEmployees.length === 1 ? "employee" : "employees"}
        description={<AttendanceLegend showHolidayHint />}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {isCurrentMonth && (
              <RunAccrualButton yearMonth={month} accrualDone={accrualDone} />
            )}
            <MonthNav
              month={month}
              baseHref="/attendance"
              currentMonth={currentMonth}
            />
          </div>
        }
      />

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
        isReadOnly={false}
        today={today}
        viewerRole={profile.role}
        currentUserId={profile.id}
        showBalanceAndFines
      />
    </div>
  );
}
