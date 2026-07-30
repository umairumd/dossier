import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { daysBetweenDateStrings, todayDateString } from "@/lib/helpers/dates";
import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import type { MissingReportRow } from "@/types/missing-report";

// Reuses getTeamReportsForDate (today) to find who's missing, then makes
// exactly one more query for all of their prior reports — not one query
// per missing employee — reducing to "most recent report_date per author"
// in application code. RLS (daily_reports_select_department_as_manager)
// still scopes that query to the manager's own department regardless.
export const getMissingReportsToday = cache(
  async (): Promise<MissingReportRow[]> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const todayMembers = await getTeamReportsForDate();
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

    const today = todayDateString();

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
