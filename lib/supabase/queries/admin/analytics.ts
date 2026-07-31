import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { dateNDaysAgo } from "@/lib/helpers/dates";
import {
  buildCompletionTrend,
  buildSubmittersByDate,
} from "@/lib/helpers/completion-trend";
import type { OrganizationTrends } from "@/types/team-insights";

const TREND_DAYS = 30;

// Only used by /admin/analytics — one 30-day report fetch backs both the
// weekly and monthly trend, so visiting this page costs one query beyond
// the (already-cached) employee list, not two.
export const getOrganizationTrends = cache(
  async (): Promise<OrganizationTrends> => {
    await requireAdminUser();

    const supabase = await createClient();
    const employees = await getAllEmployees();
    const activeEmployeeCount = employees.filter(
      (employee) => employee.role === "employee" && employee.status === "active",
    ).length;

    const { data: reportRows, error } = await supabase
      .from("daily_reports")
      .select("author_id, report_date")
      .gte("report_date", dateNDaysAgo(TREND_DAYS - 1));

    if (error) {
      throw new Error("Failed to load organization report history.");
    }

    const submittersByDate = buildSubmittersByDate(reportRows ?? []);

    return {
      weeklyTrend: buildCompletionTrend(7, submittersByDate, activeEmployeeCount),
      monthlyTrend: buildCompletionTrend(30, submittersByDate, activeEmployeeCount),
    };
  },
);
