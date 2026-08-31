import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

const REPORT_SELECT =
  "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at";

export const getOrgRosterSize = cache(async (): Promise<number> => {
  await requireAdminUser();

  const adminClient = createAdminClient();
  const { count, error } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("has_onboarded", true)
    .is("archived_at", null);

  if (error) {
    throw new Error("Failed to load organization roster size.");
  }

  return count ?? 0;
});

export const getOrgReportsForDate = cache(
  async (date: string): Promise<TeamMemberReport[]> => {
    await requireAdminUser();

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
          .select(REPORT_SELECT)
          .eq("report_date", date),
      ]);

    if (employeesError) {
      throw new Error("Failed to load organization employees.");
    }

    if (reportsError) {
      throw new Error("Failed to load reports for that date.");
    }

    const reportsByAuthor = new Map(
      ((reports as DailyReport[]) ?? []).map((report) => [
        report.author_id,
        report,
      ]),
    );

    return (employees ?? []).map((employee) => ({
      employeeId: employee.id,
      fullName: employee.full_name,
      report: reportsByAuthor.get(employee.id) ?? null,
    }));
  },
);
