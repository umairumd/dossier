import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { computeReportStats } from "@/lib/helpers/report-stats";
import type { DailyReport } from "@/types/report";
import type { TeamMemberOverview } from "@/types/team-member-overview";

interface ProfileRow {
  id: string;
  full_name: string;
  role: TeamMemberOverview["role"];
}

// No requireManagerUser()-style guard here, unlike the admin equivalents:
// RLS (profiles_select_department_as_manager,
// daily_reports_select_department_as_manager) is the entire enforcement
// mechanism. A manager querying an employeeId outside their own
// department gets zero rows back — indistinguishable from "doesn't
// exist" — which is exactly "managers must never see employees outside
// their departments," with no extra code needed to guarantee it.
export const getTeamMemberOverview = cache(
  async (employeeId: string): Promise<TeamMemberOverview | null> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", employeeId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load employee.");
    }

    if (!profile) {
      return null;
    }

    const { data: reports, error: reportsError } = await supabase
      .from("daily_reports")
      .select(
        "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at",
      )
      .eq("author_id", employeeId)
      .order("report_date", { ascending: false })
      .order("submitted_at", { ascending: false });

    if (reportsError) {
      throw new Error("Failed to load employee reports.");
    }

    const { data: memberships } = await supabase
      .from("profile_departments")
      .select("department_id, departments(name)")
      .eq("profile_id", employeeId);

    const department_names = (memberships ?? [])
      .map((row) => {
        const embedded = row.departments as unknown as
          | { name: string }
          | { name: string }[]
          | null;
        const department = Array.isArray(embedded) ? embedded[0] : embedded;
        return department?.name;
      })
      .filter((name): name is string => Boolean(name));

    const allReports = (reports as DailyReport[]) ?? [];
    const stats = computeReportStats(allReports);
    const profileRow = profile as unknown as ProfileRow;

    return {
      id: profileRow.id,
      full_name: profileRow.full_name,
      role: profileRow.role,
      department_names,
      report_count: allReports.length,
      recent_reports: allReports.slice(0, 10),
      current_streak: stats.currentStreak,
      completion_percentage: stats.completionPercentage,
      average_submission_time: stats.averageSubmissionTime,
    };
  },
);
