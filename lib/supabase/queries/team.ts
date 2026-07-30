import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Deliberately does not filter by department in the query itself — RLS
// (profiles_select_department_as_manager, daily_reports_select_department_as_manager)
// already scopes both reads to the requesting manager's own department, so
// this only ever returns data for a manager's own team regardless of what
// the caller asks for. A non-manager caller gets whatever their own RLS
// policies allow (their own row only), never another department's data.
export const getManagerTeamReports = cache(
  async (): Promise<TeamMemberReport[]> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    // Archived employees are excluded from the active roster (headcount,
    // today's-status list) — this is what "not appear in active employee
    // lists" means for a manager's team view. Their historical reports
    // stay intact and remain visible via report-history queries; only the
    // live roster here excludes them.
    const { data: employees, error: employeesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "employee")
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (employeesError) {
      throw new Error("Failed to load department employees.");
    }

    const { data: reports, error: reportsError } = await supabase
      .from("daily_reports")
      .select(
        "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at",
      )
      .eq("report_date", todayDateString());

    if (reportsError) {
      throw new Error("Failed to load today's reports.");
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
