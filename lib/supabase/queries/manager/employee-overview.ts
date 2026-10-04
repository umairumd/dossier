import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  buildAttendanceStatusMap,
  computeReportStats,
  computeTenureSubmissionRate,
} from "@/lib/helpers/report-stats";
import { dateNDaysAgo } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { AttendanceStatus } from "@/types/attendance";
import type { DailyReport } from "@/types/report";
import type { TeamMemberOverview } from "@/types/team-member-overview";

interface ProfileRow {
  id: string;
  full_name: string;
  role: TeamMemberOverview["role"];
  designation: string | null;
  is_remote: boolean;
  employment_type: TeamMemberOverview["employment_type"];
  avatar_url: string | null;
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, role, designation, is_remote, employment_type, avatar_url, last_seen_at, created_at, template_id, organization_id",
      )
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
        "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at, template_id, field_responses",
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

    const allReports = (reports as DailyReport[]) ?? [];
    const settings = await getOrganizationSettings();

    const { data: attendanceRows } = await supabase
      .from("attendance_records")
      .select("date, status")
      .eq("profile_id", employeeId)
      .gte("date", dateNDaysAgo(399));

    const profileRow = profile as unknown as ProfileRow;
    const attendanceByDate = buildAttendanceStatusMap(
      (attendanceRows as { date: string; status: AttendanceStatus }[]) ?? [],
    );
    const stats = computeReportStats(allReports, settings.timezone, {
      workingDays: settings.workingDays,
      attendanceByDate,
    });
    const tenureRate = computeTenureSubmissionRate(
      allReports,
      profileRow.created_at,
      settings.workingDays,
      settings.timezone,
    );

    return {
      id: profileRow.id,
      full_name: profileRow.full_name,
      role: profileRow.role,
      designation: profileRow.designation,
      is_remote: profileRow.is_remote,
      employment_type: profileRow.employment_type,
      avatar_url: profileRow.avatar_url,
      last_seen_at: profileRow.last_seen_at,
      created_at: profileRow.created_at,
      template_id: profileRow.template_id,
      organization_id: profileRow.organization_id,
      department_ids,
      department_names,
      report_count: allReports.length,
      recent_reports: allReports.slice(0, 10),
      current_streak: stats.currentStreak,
      completion_percentage: stats.completionPercentage,
      average_submission_time: stats.averageSubmissionTime,
      tenure_rate: tenureRate,
      last_submitted_date: stats.lastSubmittedDate,
    };
  },
);
