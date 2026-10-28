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
import { ExportSheetMenu } from "@/components/attendance/export-sheet-menu";
import { monthLabel } from "@/lib/exports/attendance-sheet/build";
import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { AttendanceLegend } from "@/components/attendance/attendance-legend";
import { PersonalMonthCalendar } from "@/components/attendance/personal-month-calendar";
import { RunAccrualButton } from "@/components/attendance/run-accrual-button";
import { PageHeader } from "@/components/shared/page-header";
import { GroupHeading } from "@/components/shared/person-card";
export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  // Independent reads together; the role decides what loads next.
  const [profile, { month: monthParam }, settings] = await Promise.all([
    getCurrentProfile(),
    searchParams,
    getOrganizationSettings(),
  ]);

  const isOwnerOrAdmin = profile?.role === "owner" || profile?.role === "admin";
  const isManager = profile?.role === "manager";
  const isSupervisor = Boolean(profile?.is_supervisor);
  const isMember = profile?.role === "member" && !isSupervisor;

  if (
    !profile ||
    (!isOwnerOrAdmin && !isManager && !isSupervisor && !isMember)
  ) {
    redirect("/");
  }

  const today = todayInTimezone(settings.timezone);
  const currentMonth = today.slice(0, 7); // "YYYY-MM"
  const month = parseYearMonth(monthParam) ?? currentMonth;

  const orgId = profile.organization_id ?? "";
  const deadline = getDeadlineContext(settings);
  const profileBasePath = "/employees";
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);
  const isCurrentMonth = month === currentMonth;

  // ── Member: personal calendar only ──────────────────────────────
  if (isMember) {
    const [myRecords, myShift] = await Promise.all([
      getMyAttendance(month),
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
        />
      </div>
    );
  }

  // ── Manager / supervisor: personal calendar + slim team grid ────
  if (!isOwnerOrAdmin) {
    // The viewer's own month doesn't depend on the roster: start it first.
    const myRecordsP = getMyAttendance(month);
    const myShiftP = getCurrentShift(profile.id);
    const attendanceSettingsP = getAttendanceSettings();
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
      myRecordsP,
      myShiftP,
      attendanceSettingsP,
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
      avatar: member.avatar,
      leave_balance: member.leave_balance,
      joined_on: member.created_at ? member.created_at.slice(0, 10) : null,
    }));

    const onSiteEmployees = activeEmployees.filter((e) => !e.is_remote);
    const remoteEmployees = activeEmployees.filter((e) => e.is_remote);

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Attendance"
          description={`You and ${activeEmployees.length} ${activeEmployees.length === 1 ? "teammate" : "teammates"}`}
          action={
            <div className="flex flex-nowrap items-center gap-2">
              <AttendanceLegend />
              <MonthNav
                month={month}
                baseHref="/attendance"
                currentMonth={currentMonth}
              />
            </div>
          }
        />

        <PersonalMonthCalendar
          records={myRecords}
          yearMonth={month}
          workingDays={settings.workingDays}
          today={today}
          shift={myShift}
        />

        <section className="flex flex-col gap-3">
          <GroupHeading
            label="Your team"
            count={activeEmployees.length}
            className="mb-0"
          />
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
  const [yearNum, monthNum] = month.split("-").map(Number);

  // Every report this month loads alongside the employee list; the remote
  // people's dates are picked out once the list is in.
  const [employees, attendanceSettings, records, accrualDone, monthReportDates] =
    await Promise.all([
      getAllEmployees(),
      getAttendanceSettings(),
      getMonthlyAttendance(month),
      getMonthAccrualStatus(yearNum, monthNum),
      getRemoteAttendanceDates(null, monthStart, monthEnd),
    ]);

  const activeEmployees = employees
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
      avatar: emp.avatar,
      leave_balance: emp.leave_balance,
      joined_on: emp.created_at ? emp.created_at.slice(0, 10) : null,
    }));

  const onSiteEmployees = activeEmployees.filter((e) => !e.is_remote);
  const remoteEmployees = activeEmployees.filter((e) => e.is_remote);
  const remoteIds = new Set(remoteEmployees.map((e) => e.id));
  const remoteReportDates = monthReportDates.filter((key) =>
    remoteIds.has(key.slice(0, key.indexOf("_"))),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        description={`${activeEmployees.length} ${activeEmployees.length === 1 ? "person" : "people"}${remoteEmployees.length > 0 ? ` · ${remoteEmployees.length} remote` : ""}`}
        action={
          <div className="flex flex-nowrap items-center gap-2">
            {isCurrentMonth && (
              <RunAccrualButton yearMonth={month} accrualDone={accrualDone} />
            )}
            <AttendanceLegend showHolidayHint />
            <ExportSheetMenu month={month} monthLabel={monthLabel(month)} />
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
