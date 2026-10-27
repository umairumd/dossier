import { cache } from "react";
import { REPORTING_MATCH } from "@/lib/supabase/queries/reporting-rule";
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
import { partitionReporters } from "@/lib/helpers/report-stats";
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
  const [{ data: employees, error: employeesError }, { data: reports, error: reportsError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name")
        .match(REPORTING_MATCH)
        .is("archived_at", null),
      admin.from("daily_reports").select("author_id, report_date").gte("report_date", since),
    ]);
  if (employeesError || reportsError) {
    throw new Error("Failed to load company completion.");
  }
  const roster = employees ?? [];
  const ids = new Set(roster.map((person) => person.id));
  const rosterIdList = [...ids];
  const { data: attendance, error: attendanceError } =
    rosterIdList.length === 0
      ? { data: [] as { profile_id: string; date: string; status: AttendanceStatus }[], error: null }
      : await admin
          .from("attendance_records")
          .select("profile_id, date, status")
          .in("status", ["leave", "half_leave", "holiday", "weekly_off"])
          .in("profile_id", rosterIdList)
          .gte("date", since);
  if (attendanceError) {
    throw new Error("Failed to load company completion.");
  }
  const submittersByDate = buildSubmittersByDate(
    (reports ?? []).filter((row) => ids.has(row.author_id)),
  );
  const attendanceByDate = new Map<string, Map<string, AttendanceStatus>>();
  const holidayCounts = new Map<string, number>();
  for (const row of (attendance ?? []) as { profile_id: string; date: string; status: AttendanceStatus }[]) {
    if (!ids.has(row.profile_id)) continue;
    const byProfile = attendanceByDate.get(row.date) ?? new Map();
    byProfile.set(row.profile_id, row.status);
    attendanceByDate.set(row.date, byProfile);
    if (row.status === "holiday") {
      holidayCounts.set(row.date, (holidayCounts.get(row.date) ?? 0) + 1);
    }
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
    const dayAttendance = attendanceByDate.get(point.date) ?? new Map();
    const partition = partitionReporters(
      roster.map((person) => ({
        id: person.id,
        hasReport: submitters.has(person.id),
        attendanceStatus: dayAttendance.get(person.id) ?? null,
      })),
    );
    const nameById = new Map(roster.map((person) => [person.id, person.full_name]));
    const missingNames = partition.missing
      .map((member) => nameById.get(member.id) ?? "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return {
      ...point,
      submitted: partition.submitted.length,
      expected: partition.expected,
      away: partition.away.length,
      completionPercentage:
        partition.expected === 0
          ? 0
          : Math.min(
              100,
              Math.round((partition.submitted.length / partition.expected) * 100),
            ),
      missingNames,
    };
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
