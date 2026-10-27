import { cache } from "react";
import { REPORTING_MATCH } from "@/lib/supabase/queries/reporting-rule";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { todayInTimezone } from "@/lib/helpers/dates";
import { partitionReporters } from "@/lib/helpers/report-stats";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { AttendanceStatus } from "@/types/attendance";
import type { OrganizationSummary } from "@/types/admin-overview";

// Admin Home's data need: headcounts + today's completion, nothing more.
// Trend charts live on /admin/analytics and the invitation breakdown
// lives on /invitations — splitting this out (it used to compute
// all three) means Home no longer pays for a 30-day report fetch it
// never displayed.
export const getOrganizationSummary = cache(
  async (): Promise<OrganizationSummary> => {
    const supabase = await createClient();

    // Independent reads run together; only the count needs the roster first.
    const [, settings, employees, departments, eligible] = await Promise.all([
      requireAdminUser(),
      getOrganizationSettings(),
      getAllEmployees(),
      getAllDepartments(),
      supabase
        .from("profiles")
        .select("id")
        .match(REPORTING_MATCH)
        .is("archived_at", null),
    ]);
    const { data: eligibleProfiles, error: eligibleError } = eligible;

    const staff = employees.filter((employee) => employee.role === "member");
    const managers = employees.filter(
      (employee) =>
        employee.role === "manager" && employee.status !== "archived",
    );

    if (eligibleError) {
      throw new Error("Failed to load today's completion roster.");
    }

    const eligibleIds = (eligibleProfiles ?? []).map((profile) => profile.id);
    const today = todayInTimezone(settings.timezone);

    let submitted = 0;
    let expected = eligibleIds.length;
    let missing = eligibleIds.length;
    let away = 0;

    if (eligibleIds.length > 0) {
      const [{ data: reports, error }, { data: attendance, error: attendanceError }] =
        await Promise.all([
          supabase
            .from("daily_reports")
            .select("author_id")
            .eq("report_date", today)
            .in("author_id", eligibleIds),
          supabase
            .from("attendance_records")
            .select("profile_id, status")
            .eq("date", today)
            .in("profile_id", eligibleIds)
            .in("status", ["leave", "half_leave", "holiday", "weekly_off"]),
        ]);

      if (error) {
        throw new Error("Failed to load today's submission count.");
      }
      if (attendanceError) {
        throw new Error("Failed to load today's attendance.");
      }

      const submittedIds = new Set(
        (reports ?? []).map((report) => report.author_id),
      );
      const attendanceByProfile = new Map<string, AttendanceStatus>();
      for (const row of attendance ?? []) {
        attendanceByProfile.set(row.profile_id, row.status as AttendanceStatus);
      }

      const partition = partitionReporters(
        eligibleIds.map((id) => ({
          id,
          hasReport: submittedIds.has(id),
          attendanceStatus: attendanceByProfile.get(id) ?? null,
        })),
      );
      submitted = partition.submitted.length;
      expected = partition.expected;
      missing = partition.missing.length;
      away = partition.away.length;
    }

    return {
      employees: staff.length,
      managers: managers.length,
      departments: departments.filter((department) => !department.archived_at)
        .length,
      pendingInvites: employees.filter(
        (employee) => employee.status === "invited",
      ).length,
      archivedUsers: employees.filter((employee) => employee.status === "archived")
        .length,
      submittedToday: submitted,
      missingToday: missing,
      totalMembers: expected,
      awayToday: away,
      completionPercentageToday:
        expected === 0 ? 0 : Math.round((submitted / expected) * 100),
    };
  },
);
