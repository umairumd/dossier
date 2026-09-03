import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";

export type DeptCompletionRow = {
  departmentId: string;
  departmentName: string;
  submitted: number;
  total: number;
  completionPct: number;
};

// A person in multiple departments is counted in each row. Org-level
// Home stats use distinct profiles instead (see getOrganizationSummary).
export const getDeptCompletionToday = cache(
  async (): Promise<DeptCompletionRow[]> => {
    await requireAdminUser();

    const adminClient = createAdminClient();
    const settings = await getOrganizationSettings();
    const today = todayInTimezone(settings.timezone);

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
        .eq("has_onboarded", true)
        .eq("is_active", true)
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

    if (eligibleIds.size > 0) {
      const { data: reports, error: reportsError } = await adminClient
        .from("daily_reports")
        .select("author_id")
        .eq("report_date", today)
        .in("author_id", [...eligibleIds]);

      if (reportsError) {
        throw new Error("Failed to load today's reports.");
      }

      submittedIds = new Set((reports ?? []).map((report) => report.author_id));
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

    return (departments ?? [])
      .map((department) => {
        const members = membersByDepartment.get(department.id) ?? new Set();
        const total = members.size;
        let submitted = 0;

        for (const profileId of members) {
          if (submittedIds.has(profileId)) {
            submitted += 1;
          }
        }

        return {
          departmentId: department.id,
          departmentName: department.name,
          submitted,
          total,
          completionPct:
            total === 0 ? 0 : Math.round((submitted / total) * 100),
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => a.completionPct - b.completionPct);
  },
);
