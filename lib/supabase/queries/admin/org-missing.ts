import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { daysBetweenDateStrings, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { getOrgRosterSize } from "@/lib/supabase/queries/admin/org-reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
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
          .eq("has_onboarded", true)
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

    const submittedIds = new Set(
      (reports ?? []).map((report) => report.author_id),
    );
    const missing = (employees ?? []).filter(
      (employee) => !submittedIds.has(employee.id),
    );

    if (missing.length === 0) {
      return [];
    }

    const missingIds = missing.map((employee) => employee.id);

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

    return missing.map((employee) => {
      const lastSubmittedDate =
        lastSubmittedByAuthor.get(employee.id) ?? null;

      return {
        employeeId: employee.id,
        fullName: employee.full_name,
        lastSubmittedDate,
        daysMissed: lastSubmittedDate
          ? daysBetweenDateStrings(lastSubmittedDate, today)
          : null,
      };
    });
  },
);
