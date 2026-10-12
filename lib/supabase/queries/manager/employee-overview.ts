import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  buildAttendanceStatusMap,
  computeReportStats,
  computeTenureSubmissionRate,
  type ReportStatsInput,
} from "@/lib/helpers/report-stats";
import { dateNDaysAgo } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { AttendanceStatus } from "@/types/attendance";
import type { TeamMemberOverview } from "@/types/team-member-overview";

interface ProfileRow {
  id: string;
  full_name: string;
  role: TeamMemberOverview["role"];
  designation: string | null;
  is_remote: boolean;
  employment_type: TeamMemberOverview["employment_type"];
  avatar_url: string | null;
  avatar: unknown | null;
  last_seen_at: string | null;
  created_at: string;
  template_id: string | null;
  organization_id: string | null;
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

    const user = await getAuthUser();

    if (!user) {
      return null;
    }

    // Independent reads run together. Reports load only the columns the
    // stats need; the report history card pages through full reports on its
    // own (getReportsForAuthor).
    const [
      { data: profile, error },
      { data: reports, error: reportsError },
      { data: memberships },
      settings,
      { data: attendanceRows },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, role, designation, is_remote, employment_type, avatar_url, avatar, last_seen_at, created_at, template_id, organization_id",
        )
        .eq("id", employeeId)
        .maybeSingle(),
      supabase
        .from("daily_reports")
        .select("report_date, submitted_at")
        .eq("author_id", employeeId)
        .order("report_date", { ascending: false })
        .order("submitted_at", { ascending: false }),
      supabase
        .from("profile_departments")
        .select("department_id, departments(name)")
        .eq("profile_id", employeeId),
      getOrganizationSettings(),
      supabase
        .from("attendance_records")
        .select("date, status")
        .eq("profile_id", employeeId)
        .gte("date", dateNDaysAgo(399)),
    ]);

    if (error) {
      throw new Error("Failed to load employee.");
    }

    if (!profile) {
      return null;
    }

    if (reportsError) {
      throw new Error("Failed to load employee reports.");
    }

    const department_ids = (memberships ?? []).map(
      (row) => row.department_id as string,
    );
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

    const allReports = (reports as ReportStatsInput[]) ?? [];

    const profileRow = profile as unknown as ProfileRow;
    const attendanceByDate = buildAttendanceStatusMap(
      (attendanceRows as { date: string; status: AttendanceStatus }[]) ?? [],
    );
    // Same inputs as the admin view (getEmployeeDetail), so a profile shows
    // the same numbers whoever is looking at it.
    const stats = computeReportStats(allReports, settings.timezone, {
      workingDays: settings.workingDays,
      attendanceByDate,
      joinedOn: profileRow.created_at,
    });
    const tenureRate = computeTenureSubmissionRate(
      allReports,
      profileRow.created_at,
      settings.workingDays,
      settings.timezone,
      attendanceByDate,
    );

    return {
      id: profileRow.id,
      full_name: profileRow.full_name,
      role: profileRow.role,
      designation: profileRow.designation,
      is_remote: profileRow.is_remote,
      employment_type: profileRow.employment_type,
      avatar_url: profileRow.avatar_url,
      avatar: profileRow.avatar,
      last_seen_at: profileRow.last_seen_at,
      created_at: profileRow.created_at,
      template_id: profileRow.template_id,
      organization_id: profileRow.organization_id,
      department_ids,
      department_names,
      report_count: allReports.length,
      current_streak: stats.currentStreak,
      completion_percentage: stats.completionPercentage,
      average_submission_time: stats.averageSubmissionTime,
      tenure_rate: tenureRate,
      last_submitted_date: stats.lastSubmittedDate,
    };
  },
);
