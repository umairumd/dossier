import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

export interface TeamRosterMember {
  id: string;
  full_name: string;
  designation: string | null;
  is_remote: boolean;
  avatar_url: string | null;
  template_id: string | null;
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
      .select("id, full_name, designation, is_remote, avatar_url, template_id")
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
      .select("id, full_name, designation, is_remote, avatar_url, template_id")
      .eq("has_onboarded", true)
      .is("archived_at", null)
      .neq("role", "owner")
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
  async (date?: string): Promise<TeamMemberReport[]> => {
    const supabase = await createClient();
    const settings = await getOrganizationSettings();
    const reportDate = date ?? todayInTimezone(settings.timezone);

    const employees = await getTeamReportingRoster();

    if (employees.length === 0) {
      return [];
    }

    const { data: reports, error: reportsError } = await supabase
      .from("daily_reports")
      .select(
        "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at, template_id, field_responses",
      )
      .eq("report_date", reportDate);

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
      avatarUrl: employee.avatar_url,
      report: reportsByAuthor.get(employee.id) ?? null,
    }));
  },
);
