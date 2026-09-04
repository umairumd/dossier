import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { DailyReport } from "@/types/report";

const REPORT_SELECT =
  "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at";

export const getTodayReport = cache(async (): Promise<DailyReport | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const settings = await getOrganizationSettings();

  const { data } = await supabase
    .from("daily_reports")
    .select(REPORT_SELECT)
    .eq("author_id", user.id)
    .eq("report_date", todayInTimezone(settings.timezone))
    .maybeSingle();

  return (data as DailyReport) ?? null;
});

export const getReportHistory = cache(
  async (
    page = 1,
    limit = 15,
  ): Promise<{ reports: DailyReport[]; total: number }> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { reports: [], total: 0 };
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("daily_reports")
      .select(REPORT_SELECT, { count: "exact" })
      .eq("author_id", user.id)
      .order("report_date", { ascending: false })
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error("Failed to load report history.");
    }

    return { reports: (data as DailyReport[]) ?? [], total: count ?? 0 };
  },
);

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchReports(query: string): Promise<DailyReport[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const pattern = `%${escapeIlikePattern(trimmed)}%`;

  const { data, error } = await supabase
    .from("daily_reports")
    .select(REPORT_SELECT)
    .eq("author_id", user.id)
    .or(
      `content.ilike.${pattern},blockers.ilike.${pattern},additional_notes.ilike.${pattern}`,
    )
    .order("report_date", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error("Failed to search reports.");
  }

  return (data as DailyReport[]) ?? [];
}

export const getReportStatsData = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("daily_reports")
    .select("report_date, submitted_at")
    .eq("author_id", user.id)
    .order("report_date", { ascending: false });

  if (error) {
    throw new Error("Failed to load report stats.");
  }

  return data ?? [];
});
