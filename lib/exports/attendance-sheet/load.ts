import { lastDayOfMonth, todayInTimezone } from "@/lib/helpers/dates";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import {
  getMonthlyAttendance,
  getRemoteAttendanceDates,
} from "@/lib/supabase/queries/attendance";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { buildAttendanceSheet, type AttendanceSheet } from "./build";

/** Everything the sheet needs for one month. Callers check owner/admin first. */
export async function loadAttendanceSheet(
  month: string,
  generatedBy: string,
): Promise<AttendanceSheet> {
  const [employees, records, reportDates, settings, orgName] = await Promise.all([
    getAllEmployees(),
    getMonthlyAttendance(month),
    getRemoteAttendanceDates(null, `${month}-01`, lastDayOfMonth(month)),
    getOrganizationSettings(),
    getOrganizationName(),
  ]);

  const today = todayInTimezone(settings.timezone);
  const people = employees
    .filter((employee) => employee.status === "active" || employee.status === "invited")
    .map((employee) => ({
      id: employee.id,
      name: employee.full_name,
      designation: employee.designation?.trim() || null,
      department: employee.department_names.length > 0 ? employee.department_names.join(", ") : null,
      employment: employee.employment_type === "part_time" ? ("Part-time" as const) : ("Full-time" as const),
      remote: Boolean(employee.is_remote),
      leaveBalance: employee.leave_balance ?? null,
      joinedOn: employee.created_at ? employee.created_at.slice(0, 10) : null,
    }));

  return buildAttendanceSheet({
    month,
    orgName: orgName ?? settings.orgName ?? "Dossier",
    people,
    records,
    reportKeys: new Set(reportDates),
    workingDays: settings.workingDays,
    today,
    generatedBy,
    generatedOn: new Date(`${today}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
  });
}
