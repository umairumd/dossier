import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { todayDateString } from "@/lib/helpers/dates";
import type { ActivityItem } from "@/types/activity";
import type { AdminOverview } from "@/types/admin-overview";
import type { CompletionTrendPoint } from "@/types/team-insights";

const TREND_DAYS = 30;
const RECENT_ACTIVITY_SIZE = 15;

function dateNDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

// Reuses getAllEmployees() and getAllDepartments() entirely for the
// Organization and Invitations sections — both are already fetched (and
// cached per-request) for the Employees/Departments admin pages, so this
// adds zero queries for those two sections. Only Reporting needs new
// reads: today's submission count and a 30-day report_date list, which
// backs both the weekly and monthly trend (one query, not two).
export const getAdminOverview = cache(async (): Promise<AdminOverview> => {
  await requireAdminUser();

  const supabase = await createClient();

  const [employees, departments] = await Promise.all([
    getAllEmployees(),
    getAllDepartments(),
  ]);

  const staff = employees.filter((employee) => employee.role === "employee");
  const managers = employees.filter(
    (employee) => employee.role === "manager" && employee.status !== "archived",
  );
  const activeStaff = staff.filter((employee) => employee.status === "active");

  const organization = {
    totalEmployees: staff.length,
    activeEmployees: activeStaff.length,
    archivedEmployees: staff.filter((employee) => employee.status === "archived")
      .length,
    managers: managers.length,
    departments: departments.filter((department) => !department.archived_at)
      .length,
  };

  const invitations = {
    pendingInvites: employees.filter(
      (employee) => employee.status === "invited" || employee.status === "pending",
    ).length,
    activeUsers: employees.filter((employee) => employee.status === "active")
      .length,
    disabledUsers: employees.filter((employee) => employee.status === "disabled")
      .length,
  };

  const { data: reportRows, error } = await supabase
    .from("daily_reports")
    .select("id, author_id, report_date, submitted_at")
    .gte("report_date", dateNDaysAgo(TREND_DAYS - 1));

  if (error) {
    throw new Error("Failed to load organization report history.");
  }

  const reports = reportRows ?? [];
  const submittersByDate = new Map<string, Set<string>>();
  for (const report of reports) {
    const submitters = submittersByDate.get(report.report_date) ?? new Set();
    submitters.add(report.author_id);
    submittersByDate.set(report.report_date, submitters);
  }

  function buildTrend(days: number): CompletionTrendPoint[] {
    const points: CompletionTrendPoint[] = [];
    for (let daysAgo = days - 1; daysAgo >= 0; daysAgo -= 1) {
      const date = dateNDaysAgo(daysAgo);
      const submitterCount = submittersByDate.get(date)?.size ?? 0;
      points.push({
        date,
        completionPercentage:
          organization.activeEmployees === 0
            ? 0
            : Math.round((submitterCount / organization.activeEmployees) * 100),
      });
    }
    return points;
  }

  const today = todayDateString();
  const submittedToday = submittersByDate.get(today)?.size ?? 0;

  const reporting = {
    submittedToday,
    completionPercentage:
      organization.activeEmployees === 0
        ? 0
        : Math.round((submittedToday / organization.activeEmployees) * 100),
    weeklyTrend: buildTrend(7),
    monthlyTrend: buildTrend(30),
  };

  const nameById = new Map(employees.map((employee) => [employee.id, employee.full_name]));

  // Recent activity is derived from existing timestamped columns at read
  // time, not a persisted audit log — see components/analytics/activity-feed.tsx
  // for the same caveat on the manager dashboard's feed.
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

  const reportActivity: ActivityItem[] = reports.map((report) => ({
    id: report.id,
    type: "report_submitted" as const,
    label: `${nameById.get(report.author_id) ?? "Someone"} submitted a report`,
    timestamp: report.submitted_at,
    href: `/admin/employees/${report.author_id}`,
  }));

  const recentActivity = [
    ...invitedActivity,
    ...archivedActivity,
    ...departmentActivity,
    ...reportActivity,
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, RECENT_ACTIVITY_SIZE);

  return { organization, reporting, invitations, recentActivity };
});
