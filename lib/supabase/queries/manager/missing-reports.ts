import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { daysBetweenDateStrings, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { MissingReportRow } from "@/types/missing-report";

export const getMissingReportsToday = cache(
  async (): Promise<MissingReportRow[]> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const settings = await getOrganizationSettings();
    const today = todayInTimezone(settings.timezone);

    if (!isWorkingDay(today, settings.workingDays)) {
      return [];
    }

    const todayMembers = await getTeamReportsForDate(today);
    const missing = todayMembers.filter((member) => !member.report);

    if (missing.length === 0) {
      return [];
    }

    const missingIds = missing.map((member) => member.employeeId);

    const { data: priorReports, error } = await supabase
      .from("daily_reports")
      .select("author_id, report_date")
      .in("author_id", missingIds)
      .order("report_date", { ascending: false });

    if (error) {
      throw new Error("Failed to load prior report history.");
    }

    const lastSubmittedByAuthor = new Map<string, string>();
    for (const row of priorReports ?? []) {
      if (!lastSubmittedByAuthor.has(row.author_id)) {
        lastSubmittedByAuthor.set(row.author_id, row.report_date);
      }
    }

    return missing.map((member) => {
      const lastSubmittedDate =
        lastSubmittedByAuthor.get(member.employeeId) ?? null;

      return {
        employeeId: member.employeeId,
        fullName: member.fullName,
        lastSubmittedDate,
        daysMissed: lastSubmittedDate
          ? daysBetweenDateStrings(lastSubmittedDate, today)
          : null,
      };
    });
  },
);
