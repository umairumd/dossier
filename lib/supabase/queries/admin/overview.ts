import { cache } from "react";
import { REPORTING_MATCH } from "@/lib/supabase/queries/reporting-rule";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { OrganizationSummary } from "@/types/admin-overview";

// Admin Home's data need: headcounts + today's completion, nothing more.
// Trend charts live on /admin/analytics and the invitation breakdown
// lives on /invitations — splitting this out (it used to compute
// all three) means Home no longer pays for a 30-day report fetch it
// never displayed.
export const getOrganizationSummary = cache(
  async (): Promise<OrganizationSummary> => {
    const supabase = await createClient();

    // Independent reads run together; only the count needs the roster first.
    const [, settings, employees, departments, eligible] = await Promise.all([
      requireAdminUser(),
      getOrganizationSettings(),
      getAllEmployees(),
      getAllDepartments(),
      supabase
        .from("profiles")
        .select("id")
        .match(REPORTING_MATCH)
        .is("archived_at", null),
    ]);
    const { data: eligibleProfiles, error: eligibleError } = eligible;

    const staff = employees.filter((employee) => employee.role === "member");
    const managers = employees.filter(
      (employee) =>
        employee.role === "manager" && employee.status !== "archived",
    );

    if (eligibleError) {
      throw new Error("Failed to load today's completion roster.");
    }

    const eligibleIds = (eligibleProfiles ?? []).map((profile) => profile.id);

    let submitted = 0;

    if (eligibleIds.length > 0) {
      const { count: submittedToday, error } = await supabase
        .from("daily_reports")
        .select("id", { count: "exact", head: true })
        .eq("report_date", todayInTimezone(settings.timezone))
        .in("author_id", eligibleIds);

      if (error) {
        throw new Error("Failed to load today's submission count.");
      }

      submitted = submittedToday ?? 0;
    }

    return {
      employees: staff.length,
      managers: managers.length,
      departments: departments.filter((department) => !department.archived_at)
        .length,
      pendingInvites: employees.filter(
        (employee) => employee.status === "invited",
      ).length,
      archivedUsers: employees.filter((employee) => employee.status === "archived")
        .length,
      submittedToday: submitted,
      missingToday: Math.max(eligibleIds.length - submitted, 0),
      totalMembers: eligibleIds.length,
      completionPercentageToday:
        eligibleIds.length === 0
          ? 0
          : Math.round((submitted / eligibleIds.length) * 100),
    };
  },
);
