// Loads one person's records for the export. Owners and admins only.
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getAttendanceSettings } from "@/lib/supabase/queries/attendance";
import { getOrgTemplatesWithFields } from "@/lib/supabase/queries/templates";
import { getCommentsForReports } from "@/lib/supabase/queries/report-comments";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { todayInTimezone } from "@/lib/helpers/dates";
import { addDays, type RecordAttendanceRow, type RecordComment, type RecordRaw } from "./build";
import type { DailyReport } from "@/types/report";

const REPORT_SELECT =
  "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at, template_id, field_responses";

type DepartmentEmbed = {
  departments:
    | { name: string; manager_id: string | null; manager: { full_name: string } | { full_name: string }[] | null }
    | { name: string; manager_id: string | null; manager: { full_name: string } | { full_name: string }[] | null }[]
    | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function loadEmployeeRecordRaw(
  employeeId: string,
  from: string,
  to: string,
  { withComments }: { withComments: boolean },
): Promise<RecordRaw | null> {
  await requireAdminUser();
  const supabase = await createClient();

  const [
    { data: profile },
    { data: memberships },
    settings,
    attendanceSettings,
    { data: shifts },
    { data: attendance },
    { data: reports },
    templates,
    { data: accruals },
    { data: adjustments },
    orgName,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, designation, created_at, leave_balance")
      .eq("id", employeeId)
      .maybeSingle(),
    supabase
      .from("profile_departments")
      .select(
        "departments(name, manager_id, manager:profiles!departments_manager_id_fkey(full_name))",
      )
      .eq("profile_id", employeeId),
    getOrganizationSettings(),
    getAttendanceSettings(),
    supabase
      .from("shift_assignments")
      .select("shift_type, effective_from, effective_to")
      .eq("profile_id", employeeId),
    supabase
      .from("attendance_records")
      .select("date, status, check_in_time, fine_amount, leave_deducted, notes, holiday_name")
      .eq("profile_id", employeeId)
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("daily_reports")
      .select(REPORT_SELECT)
      .eq("author_id", employeeId)
      .gte("report_date", from)
      .lte("report_date", to)
      .order("report_date", { ascending: true }),
    getOrgTemplatesWithFields(),
    supabase
      .from("leave_accruals")
      .select("year, month, credited")
      .eq("profile_id", employeeId),
    supabase
      .from("leave_balance_adjustments")
      .select("adjustment, created_at")
      .eq("profile_id", employeeId)
      .gte("created_at", `${addDays(from, -1)}T00:00:00Z`)
      .lte("created_at", `${addDays(to, 1)}T23:59:59Z`),
    getOrganizationName(),
  ]);

  if (!profile) return null;

  const reportRows = (reports as DailyReport[] | null) ?? [];
  const comments: Record<string, RecordComment[]> = {};
  if (withComments && reportRows.length > 0) {
    const byReport = await getCommentsForReports(reportRows.map((r) => r.id));
    for (const [reportId, list] of Object.entries(byReport)) {
      comments[reportId] = list.map((c) => ({
        authorId: c.profiles?.id ?? null,
        authorName: c.profiles?.full_name ?? "Someone",
        body: c.body,
        createdAt: c.created_at,
      }));
    }
  }

  const departments: string[] = [];
  const managers: string[] = [];
  for (const row of (memberships as DepartmentEmbed[] | null) ?? []) {
    const dept = one(row.departments);
    if (!dept) continue;
    departments.push(dept.name);
    const manager = one(dept.manager);
    if (manager?.full_name && dept.manager_id !== employeeId && !managers.includes(manager.full_name)) {
      managers.push(manager.full_name);
    }
  }

  return {
    person: {
      id: profile.id,
      name: profile.full_name,
      designation: profile.designation ?? null,
      departments,
      managerName: managers.length > 0 ? managers.join(", ") : null,
      joinedOn: (profile.created_at as string).slice(0, 10),
      leaveBalanceNow: Number(profile.leave_balance ?? 0),
    },
    orgName: settings.orgName ?? orgName,
    timezone: settings.timezone,
    workingDays: settings.workingDays,
    deadlineHourLocal: settings.reportDeadlineHourLocal,
    today: todayInTimezone(settings.timezone),
    shiftStarts: {
      fulltime: attendanceSettings.shiftFulltimeStart,
      morning: attendanceSettings.shiftMorningStart,
      evening: attendanceSettings.shiftEveningStart,
    },
    shifts: (shifts as RecordRaw["shifts"] | null) ?? [],
    attendance: (attendance as RecordAttendanceRow[] | null) ?? [],
    reports: reportRows,
    templates,
    comments,
    accruals: (accruals as RecordRaw["accruals"] | null) ?? [],
    adjustments: (adjustments as RecordRaw["adjustments"] | null) ?? [],
  };
}

