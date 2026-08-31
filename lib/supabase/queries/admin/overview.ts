import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { todayDateString } from "@/lib/helpers/dates";
import type { OrganizationSummary } from "@/types/admin-overview";

// Admin Home's data need: headcounts + today's completion, nothing more.
// Trend charts live on /admin/analytics and the invitation breakdown
// lives on /admin/invitations — splitting this out (it used to compute
// all three) means Home no longer pays for a 30-day report fetch it
// never displayed.
export const getOrganizationSummary = cache(
  async (): Promise<OrganizationSummary> => {
    await requireAdminUser();

    const supabase = await createClient();

    const [employees, departments] = await Promise.all([
      getAllEmployees(),
      getAllDepartments(),
    ]);

    const staff = employees.filter((employee) => employee.role === "member");
    const activeStaff = staff.filter((employee) => employee.status === "active");
    const managers = employees.filter(
      (employee) =>
        employee.role === "manager" && employee.status !== "archived",
    );

    const { count: submittedToday, error } = await supabase
      .from("daily_reports")
      .select("id", { count: "exact", head: true })
      .eq("report_date", todayDateString());

    if (error) {
      throw new Error("Failed to load today's submission count.");
    }

    const submitted = submittedToday ?? 0;

    return {
      employees: staff.length,
      managers: managers.length,
      departments: departments.filter((department) => !department.archived_at)
        .length,
      pendingInvites: employees.filter(
        (employee) =>
          employee.status === "invited" || employee.status === "pending",
      ).length,
      archivedUsers: employees.filter((employee) => employee.status === "archived")
        .length,
      submittedToday: submitted,
      completionPercentageToday:
        activeStaff.length === 0
          ? 0
          : Math.round((submitted / activeStaff.length) * 100),
    };
  },
);
