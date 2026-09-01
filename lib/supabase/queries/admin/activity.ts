import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import type { ActivityItem } from "@/types/activity";

// Reused by both Admin Home (small limit, a glance) and the dedicated
// Activity page (larger limit, the fuller view) — one function, one
// definition of what counts as "recent activity," parameterized by how
// much of it to show. See components/analytics/activity-feed.tsx for the
// caveat this is a derived feed from existing timestamp columns, not a
// persisted audit log.
export const getRecentActivity = cache(
  async (limit: number): Promise<ActivityItem[]> => {
    await requireAdminUser();

    const supabase = await createClient();
    const adminClient = createAdminClient();

    const [employees, departments, { data: profiles, error: namesError }] =
      await Promise.all([
        getAllEmployees(),
        getAllDepartments(),
        adminClient.from("profiles").select("id, full_name"),
      ]);

    if (namesError) {
      throw new Error("Failed to load profile names.");
    }

    const nameById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
    );

    const invitedActivity: ActivityItem[] = employees
      .filter((employee) => employee.invited_at)
      .map((employee) => ({
        id: `invited-${employee.id}`,
        type: "invited" as const,
        label: `${employee.full_name} was invited`,
        timestamp: employee.invited_at!,
        href: `/admin/employees/${employee.id}`,
      }));

    const archivedActivity: ActivityItem[] = employees
      .filter((employee) => employee.archived_at)
      .map((employee) => ({
        id: `archived-${employee.id}`,
        type: "archived" as const,
        label: `${employee.full_name} was archived`,
        timestamp: employee.archived_at!,
        href: `/admin/employees/${employee.id}`,
      }));

    const departmentActivity: ActivityItem[] = departments.map((department) => ({
      id: `department-${department.id}`,
      type: "department_created" as const,
      label: `${department.name} department was created`,
      timestamp: department.created_at,
    }));

    // Direct ORDER BY + LIMIT for submissions, rather than fetching a wide
    // date window and sorting in memory (that pattern belongs to the
    // trend queries, which need every day represented — this only needs
    // the most recent N).
    const { data: recentReports, error } = await supabase
      .from("daily_reports")
      .select("id, author_id, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error("Failed to load recent report submissions.");
    }

    const reportActivity: ActivityItem[] = (recentReports ?? []).map((report) => ({
      id: report.id,
      type: "report_submitted" as const,
      label: `${nameById.get(report.author_id) ?? "Someone"} submitted a report`,
      timestamp: report.submitted_at,
      href: `/admin/employees/${report.author_id}`,
    }));

    return [
      ...invitedActivity,
      ...archivedActivity,
      ...departmentActivity,
      ...reportActivity,
    ]
      .sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  },
);
