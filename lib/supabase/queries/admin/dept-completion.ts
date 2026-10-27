import { cache } from "react";
import { REPORTING_MATCH } from "@/lib/supabase/queries/reporting-rule";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { todayInTimezone } from "@/lib/helpers/dates";
import {
  partitionReporters,
  type PartitionableReporter,
} from "@/lib/helpers/report-stats";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { AttendanceStatus } from "@/types/attendance";

export type DeptCompletionRow = {
  departmentId: string;
  departmentName: string;
  submitted: number;
  /** Expected reporters (submitted + missing); excludes away. */
  total: number;
  away: number;
  completionPct: number;
};

function summarizeDepartment(
  memberIds: Iterable<string>,
  submittedIds: Set<string>,
  attendanceByProfile: Map<string, AttendanceStatus>,
): { submitted: number; total: number; away: number; completionPct: number } {
  const members: PartitionableReporter[] = [];
  for (const id of memberIds) {
    members.push({
      id,
      hasReport: submittedIds.has(id),
      attendanceStatus: attendanceByProfile.get(id) ?? null,
    });
  }
  const { submitted, away, expected } = partitionReporters(members);
  return {
    submitted: submitted.length,
    total: expected,
    away: away.length,
    completionPct:
      expected === 0 ? 0 : Math.round((submitted.length / expected) * 100),
  };
}

// A person in multiple departments is counted in each row. Org-level
// Home stats use distinct profiles instead (see getOrganizationSummary).
export const getDeptCompletionForDate = cache(
  async (date: string): Promise<DeptCompletionRow[]> => {
    await requireAdminUser();

    const adminClient = createAdminClient();

    const [
      { data: departments, error: departmentsError },
      { data: eligible, error: eligibleError },
      { data: memberships, error: membershipsError },
    ] = await Promise.all([
      adminClient
        .from("departments")
        .select("id, name")
        .is("archived_at", null),
      adminClient
        .from("profiles")
        .select("id")
        .match(REPORTING_MATCH)
        .is("archived_at", null),
      adminClient.from("profile_departments").select("department_id, profile_id"),
    ]);

    if (departmentsError) {
      throw new Error("Failed to load departments.");
    }

    if (eligibleError) {
      throw new Error("Failed to load department members.");
    }

    if (membershipsError) {
      throw new Error("Failed to load department assignments.");
    }

    const eligibleIds = new Set((eligible ?? []).map((profile) => profile.id));

    let submittedIds = new Set<string>();
    const attendanceByProfile = new Map<string, AttendanceStatus>();

    if (eligibleIds.size > 0) {
      const eligibleList = [...eligibleIds];
      const [{ data: reports, error: reportsError }, { data: attendance, error: attendanceError }] =
        await Promise.all([
          adminClient
            .from("daily_reports")
            .select("author_id")
            .eq("report_date", date)
            .in("author_id", eligibleList),
          adminClient
            .from("attendance_records")
            .select("profile_id, status")
            .eq("date", date)
            .in("profile_id", eligibleList)
            .in("status", ["leave", "half_leave", "holiday", "weekly_off"]),
        ]);

      if (reportsError) {
        throw new Error("Failed to load today's reports.");
      }
      if (attendanceError) {
        throw new Error("Failed to load attendance for department completion.");
      }

      submittedIds = new Set((reports ?? []).map((report) => report.author_id));
      for (const row of attendance ?? []) {
        attendanceByProfile.set(row.profile_id, row.status as AttendanceStatus);
      }
    }

    const membersByDepartment = new Map<string, Set<string>>();

    for (const row of memberships ?? []) {
      if (!eligibleIds.has(row.profile_id)) {
        continue;
      }

      const members = membersByDepartment.get(row.department_id) ?? new Set();
      members.add(row.profile_id);
      membersByDepartment.set(row.department_id, members);
    }

    const rows = (departments ?? [])
      .map((department) => {
        const members = membersByDepartment.get(department.id) ?? new Set();
        const summary = summarizeDepartment(
          members,
          submittedIds,
          attendanceByProfile,
        );
        return {
          departmentId: department.id,
          departmentName: department.name,
          ...summary,
        };
      })
      .filter((row) => row.total + row.away > 0)
      .sort((a, b) => a.completionPct - b.completionPct);

    const assignedIds = new Set(
      (memberships ?? []).map((row) => row.profile_id),
    );
    const unassignedIds = [...eligibleIds].filter((id) => !assignedIds.has(id));

    if (unassignedIds.length > 0) {
      const summary = summarizeDepartment(
        unassignedIds,
        submittedIds,
        attendanceByProfile,
      );
      rows.push({
        departmentId: "__unassigned__",
        departmentName: "Other",
        ...summary,
      });
    }

    return rows;
  },
);

export const getDeptCompletionToday = cache(
  async (): Promise<DeptCompletionRow[]> => {
    const settings = await getOrganizationSettings();
    const today = todayInTimezone(settings.timezone);
    return getDeptCompletionForDate(today);
  },
);
