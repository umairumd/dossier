import { cache } from "react";
import { REPORTING_MATCH } from "@/lib/supabase/queries/reporting-rule";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { daysBetweenDateStrings, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { partitionReporters } from "@/lib/helpers/report-stats";
import { getOrgRosterSize } from "@/lib/supabase/queries/admin/org-reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { AttendanceStatus } from "@/types/attendance";
import type { MissingReportRow } from "@/types/missing-report";

export { getOrgRosterSize as getOrgTeamSize };

export const getOrgMissingReportsToday = cache(
  async (): Promise<MissingReportRow[]> => {
    await requireAdminUser();

    const settings = await getOrganizationSettings();
    const today = todayInTimezone(settings.timezone);

    if (!isWorkingDay(today, settings.workingDays)) {
      return [];
    }

    const adminClient = createAdminClient();

    const [{ data: employees, error: employeesError }, { data: reports, error: reportsError }] =
      await Promise.all([
        adminClient
          .from("profiles")
          .select("id, full_name")
          .match(REPORTING_MATCH)
          .is("archived_at", null)
          .order("full_name", { ascending: true }),
        adminClient
          .from("daily_reports")
          .select("author_id")
          .eq("report_date", today),
      ]);

    if (employeesError) {
      throw new Error("Failed to load organization employees.");
    }

    if (reportsError) {
      throw new Error("Failed to load today's reports.");
    }

    const roster = employees ?? [];
    const submittedIds = new Set(
      (reports ?? []).map((report) => report.author_id),
    );

    const attendanceByProfile = new Map<string, AttendanceStatus>();
    if (roster.length > 0) {
      const { data: attendance, error: attendanceError } = await adminClient
        .from("attendance_records")
        .select("profile_id, status")
        .eq("date", today)
        .in(
          "profile_id",
          roster.map((employee) => employee.id),
        )
        .in("status", ["leave", "half_leave", "holiday", "weekly_off"]);

      if (attendanceError) {
        throw new Error("Failed to load today's attendance.");
      }

      for (const row of attendance ?? []) {
        attendanceByProfile.set(row.profile_id, row.status as AttendanceStatus);
      }
    }

    const partition = partitionReporters(
      roster.map((employee) => ({
        id: employee.id,
        hasReport: submittedIds.has(employee.id),
        attendanceStatus: attendanceByProfile.get(employee.id) ?? null,
      })),
    );

    const missing = partition.missing;
    if (missing.length === 0) {
      return [];
    }

    const nameById = new Map(roster.map((employee) => [employee.id, employee.full_name]));
    const missingIds = missing.map((member) => member.id);

    const { data: priorReports, error: priorError } = await adminClient
      .from("daily_reports")
      .select("author_id, report_date")
      .in("author_id", missingIds)
      .order("report_date", { ascending: false });

    if (priorError) {
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
        lastSubmittedByAuthor.get(member.id) ?? null;

      return {
        employeeId: member.id,
        fullName: nameById.get(member.id) ?? "",
        lastSubmittedDate,
        daysMissed: lastSubmittedDate
          ? daysBetweenDateStrings(lastSubmittedDate, today)
          : null,
      };
    });
  },
);
