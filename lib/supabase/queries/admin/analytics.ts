import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { dateNDaysAgo } from "@/lib/helpers/dates";
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

    const submittersByDate = new Map<string, Set<string>>();
    for (const report of reportRows ?? []) {
      const submitters = submittersByDate.get(report.report_date) ?? new Set();
      submitters.add(report.author_id);
      submittersByDate.set(report.report_date, submitters);
    }

    function buildTrend(days: number) {
      const points = [];
      for (let daysAgo = days - 1; daysAgo >= 0; daysAgo -= 1) {
        const date = dateNDaysAgo(daysAgo);
        const submitterCount = submittersByDate.get(date)?.size ?? 0;
        points.push({
          date,
          completionPercentage:
            activeEmployeeCount === 0
              ? 0
              : Math.round((submitterCount / activeEmployeeCount) * 100),
        });
      }
      return points;
    }

    return {
      weeklyTrend: buildTrend(7),
      monthlyTrend: buildTrend(30),
    };
  },
);
