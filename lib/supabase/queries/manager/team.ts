import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/helpers/dates";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

export interface TeamRosterMember {
  id: string;
  full_name: string;
  designation: string | null;
  is_remote: boolean;
}

// Deliberately does not filter by department in the query itself — RLS
// (profiles_select_department_as_manager) already scopes this read to the
// requesting manager's own department. Extracted so every manager query
// that needs "who's on my team" (today's status, insights, the plain
// team list) shares one definition instead of repeating this select.
export const getTeamRoster = cache(
  async (): Promise<TeamRosterMember[]> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: employees, error } = await supabase
      .from("profiles")
      .select("id, full_name, designation, is_remote")
      .eq("is_active", true)
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (error) {
      throw new Error("Failed to load department employees.");
    }

    return employees ?? [];
  },
);

export const getTeamReportingRoster = cache(
  async (): Promise<TeamRosterMember[]> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    // Archived employees are excluded — "not appear in active employee
    // lists" — their historical reports stay intact and remain visible
    // via report-history queries; only the live roster excludes them.
    const { data: employees, error } = await supabase
      .from("profiles")
      .select("id, full_name, designation, is_remote")
      .eq("has_onboarded", true)
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (error) {
      throw new Error("Failed to load department employees.");
    }

    return employees ?? [];
  },
);

export const getTeamEmployeeRoster = getTeamReportingRoster;

// Parameterized by date (defaults to today) so the same query backs both
// the dashboard's today-only snapshot and the Team Reports page's date
// filter — "today's reports" and "previous reports" are the same view at
// different dates, not two separate features. RLS
// (daily_reports_select_department_as_manager) scopes the reports read
// the same way the roster read is scoped.
export const getTeamReportsForDate = cache(
  async (date: string = todayDateString()): Promise<TeamMemberReport[]> => {
    const supabase = await createClient();

    const employees = await getTeamReportingRoster();

    if (employees.length === 0) {
      return [];
    }

    const { data: reports, error: reportsError } = await supabase
      .from("daily_reports")
      .select(
        "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at",
      )
      .eq("report_date", date);

    if (reportsError) {
      throw new Error("Failed to load reports for that date.");
    }

    const reportsByAuthor = new Map(
      ((reports as DailyReport[]) ?? []).map((report) => [
        report.author_id,
        report,
      ]),
    );

    return employees.map((employee) => ({
      employeeId: employee.id,
      fullName: employee.full_name,
      designation: employee.designation,
      report: reportsByAuthor.get(employee.id) ?? null,
    }));
  },
);
