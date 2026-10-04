import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireSupervisorUser } from "@/lib/supabase/require-admin";
import { daysBetweenDateStrings, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { TeamRosterMember } from "@/lib/supabase/queries/manager/team";
import type { AttendanceStatus } from "@/types/attendance";
import type { DailyReport } from "@/types/report";
import type { MissingReportRow } from "@/types/missing-report";
import type { TeamMemberReport } from "@/types/team";

const REPORT_SELECT =
  "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at, template_id, field_responses";

export const getSupervisedMembers = cache(
  async (): Promise<TeamRosterMember[]> => {
    await requireSupervisorUser();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("member_supervisors")
      .select("member_id")
      .eq("supervisor_id", user.id);

    if (assignmentsError) {
      throw new Error("Failed to load supervised members.");
    }

    const memberIds = (assignments ?? []).map((row) => row.member_id);

    if (memberIds.length === 0) {
      return [];
    }

    const { data: employees, error: employeesError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, designation, is_remote, employment_type, avatar_url, template_id, leave_balance, created_at",
      )
      .in("id", memberIds)
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (employeesError) {
      throw new Error("Failed to load supervised members.");
    }

    return (employees ?? []).map((row) => ({
      ...row,
      leave_balance: Number(row.leave_balance ?? 0),
    }));
  },
);

export const getSupervisedReportsForDate = cache(
  async (date: string): Promise<TeamMemberReport[]> => {
    await requireSupervisorUser();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("member_supervisors")
      .select("member_id")
      .eq("supervisor_id", user.id);

    if (assignmentsError) {
      throw new Error("Failed to load supervised members.");
    }

    const memberIds = (assignments ?? []).map((row) => row.member_id);

    if (memberIds.length === 0) {
      return [];
    }

    const { data: employees, error: employeesError } = await supabase
      .from("profiles")
      .select("id, full_name, designation, is_remote, employment_type, avatar_url")
      .in("id", memberIds)
      .eq("has_onboarded", true)
      .eq("is_reporting", true)
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (employeesError) {
      throw new Error("Failed to load supervised members.");
    }

    if (!employees || employees.length === 0) {
      return [];
    }

    const employeeIds = employees.map((employee) => employee.id);

    const [
      { data: reports, error: reportsError },
      { data: attendanceRows, error: attendanceError },
    ] = await Promise.all([
      supabase
        .from("daily_reports")
        .select(REPORT_SELECT)
        .in("author_id", employeeIds)
        .eq("report_date", date),
      supabase
        .from("attendance_records")
        .select("profile_id, status")
        .eq("date", date)
        .in("status", ["leave", "half_leave", "holiday", "weekly_off"])
        .in("profile_id", employeeIds),
    ]);

    if (reportsError) {
      throw new Error("Failed to load reports for that date.");
    }

    if (attendanceError) {
      throw new Error("Failed to load attendance records for that date.");
    }

    const reportsByAuthor = new Map(
      ((reports as DailyReport[]) ?? []).map((report) => [
        report.author_id,
        report,
      ]),
    );
    const attendanceByProfile = new Map<string, AttendanceStatus>();
    for (const row of attendanceRows ?? []) {
      attendanceByProfile.set(
        row.profile_id as string,
        row.status as AttendanceStatus,
      );
    }

    return employees.map((employee) => {
      const attendanceStatus = attendanceByProfile.get(employee.id) ?? null;
      return {
        employeeId: employee.id,
        fullName: employee.full_name,
        designation: employee.designation,
        avatarUrl: employee.avatar_url,
        isRemote: employee.is_remote,
        employment_type: employee.employment_type,
        attendanceStatus,
        isOnLeave:
          attendanceStatus === "leave" || attendanceStatus === "half_leave",
        report: reportsByAuthor.get(employee.id) ?? null,
      };
    });
  },
);

export const getSupervisedMissingToday = cache(
  async (): Promise<MissingReportRow[]> => {
    await requireSupervisorUser();

    const supabase = await createClient();
    const settings = await getOrganizationSettings();
    const today = todayInTimezone(settings.timezone);

    if (!isWorkingDay(today, settings.workingDays)) {
      return [];
    }

    const todayMembers = await getSupervisedReportsForDate(today);
    const missing = todayMembers.filter(
      (member) => !member.report && !member.isOnLeave,
    );

    if (missing.length === 0) {
      return [];
    }

    const missingIds = missing.map((member) => member.employeeId);

    const { data: priorReports, error } = await supabase
      .from("daily_reports")
      .select("author_id, report_date")
      .in("author_id", missingIds)
      .order("report_date", { ascending: false });

    if (error) {
      throw new Error("Failed to load prior report history.");
    }

    const lastSubmittedByAuthor = new Map<string, string>();
    for (const row of priorReports ?? []) {
      if (!lastSubmittedByAuthor.has(row.author_id)) {
        lastSubmittedByAuthor.set(row.author_id, row.report_date);
      }
    }

    return missing.map((member) => {
      const lastSubmittedDate =
        lastSubmittedByAuthor.get(member.employeeId) ?? null;

      return {
        employeeId: member.employeeId,
        fullName: member.fullName,
        lastSubmittedDate,
        daysMissed: lastSubmittedDate
          ? daysBetweenDateStrings(lastSubmittedDate, today)
          : null,
      };
    });
  },
);
