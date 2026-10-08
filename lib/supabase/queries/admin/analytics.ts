import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { dateNDaysAgo, todayInTimezone } from "@/lib/helpers/dates";
import {
  buildCompletionTrend,
  buildSubmittersByDate,
  completionWindows,
} from "@/lib/helpers/completion-trend";
import { deadlineWindow } from "@/lib/helpers/deadline-window";
import type { AttendanceStatus } from "@/types/attendance";
import type { CompletionTrendPoint, OrganizationTrends } from "@/types/team-insights";

export type CompanyCompletion = {
  trend: CompletionTrendPoint[];
  previousAverage: number | null;
};

const TREND_DAYS = 30;

// Only used by /admin/analytics — one 30-day report fetch backs both the
// weekly and monthly trend, so visiting this page costs one query beyond
// the (already-cached) employee list, not two.
export const getOrganizationTrends = cache(
  async (): Promise<OrganizationTrends> => {
    await requireAdminUser();

    const supabase = await createClient();
    const settings = await getOrganizationSettings();
    const employees = await getAllEmployees();
    const activeEmployeeCount = employees.filter(
      (employee) => employee.role === "member" && employee.status === "active",
    ).length;

    const { data: reportRows, error } = await supabase
      .from("daily_reports")
      .select("author_id, report_date")
      .gte("report_date", dateNDaysAgo(TREND_DAYS - 1));

    if (error) {
      throw new Error("Failed to load organization report history.");
    }

    const eligibleIds = new Set(
      employees
        .filter(
          (employee) =>
            employee.role === "member" && employee.status === "active",
        )
        .map((employee) => employee.id),
    );
    const submittersByDate = buildSubmittersByDate(
      (reportRows ?? []).filter((row) => eligibleIds.has(row.author_id)),
    );

    return {
      weeklyTrend: buildCompletionTrend(
        7,
        submittersByDate,
        activeEmployeeCount,
        settings.workingDays,
        settings.timezone,
      ),
      monthlyTrend: buildCompletionTrend(
        30,
        submittersByDate,
        activeEmployeeCount,
        settings.workingDays,
        settings.timezone,
      ),
    };
  },
);

/** Last 30 working days of company completion, plus the average of the 30 days before. */
export const getCompanyCompletion = cache(async (): Promise<CompanyCompletion> => {
  await requireAdminUser();
  const admin = createAdminClient();
  const settings = await getOrganizationSettings();
  const since = dateNDaysAgo(59);
  const [{ data: employees, error: employeesError }, { data: reports, error: reportsError }, { data: attendance, error: attendanceError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name")
        .eq("has_onboarded", true)
        .eq("is_reporting", true)
        .eq("is_active", true)
        .is("archived_at", null)
        .neq("role", "owner"),
      admin.from("daily_reports").select("author_id, report_date").gte("report_date", since),
      admin
        .from("attendance_records")
        .select("profile_id, date, status")
        .eq("status", "holiday")
        .gte("date", since),
    ]);
  if (employeesError || reportsError || attendanceError) {
    throw new Error("Failed to load company completion.");
  }
  const roster = employees ?? [];
  const ids = new Set(roster.map((person) => person.id));
  const submittersByDate = buildSubmittersByDate(
    (reports ?? []).filter((row) => ids.has(row.author_id)),
  );
  const holidayCounts = new Map<string, number>();
  for (const row of (attendance ?? []) as { profile_id: string; date: string; status: AttendanceStatus }[]) {
    if (!ids.has(row.profile_id)) continue;
    holidayCounts.set(row.date, (holidayCounts.get(row.date) ?? 0) + 1);
  }
  const holidays = new Set<string>();
  for (const [date, count] of holidayCounts) {
    if (roster.length > 0 && count === roster.length) holidays.add(date);
  }
  const series = buildCompletionTrend(
    60,
    submittersByDate,
    roster.length,
    settings.workingDays,
    settings.timezone,
    holidays,
  ).map((point) => {
    const submitters = submittersByDate.get(point.date) ?? new Set();
    const missingNames = roster
      .filter((person) => !submitters.has(person.id))
      .map((person) => person.full_name)
      .sort((a, b) => a.localeCompare(b));
    return { ...point, missingNames };
  });
  const today = todayInTimezone(settings.timezone);
  const includeToday = deadlineWindow(
    new Date(),
    settings.timezone,
    "00:00",
    settings.reportDeadlineHourLocal,
  ).pastDue;
  return completionWindows(series, today, includeToday);
});
