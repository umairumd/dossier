import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { REPORT_PAGE_SIZE } from "@/lib/reports/constants";
import type { DailyReport } from "@/types/report";

const REPORT_SELECT =
  "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at, template_id, field_responses";

export const getTodayReport = cache(async (): Promise<DailyReport | null> => {
  const supabase = await createClient();

  const user = await getAuthUser();

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

/**
 * One page of a person's reports, newest first, with the total count. Every
 * report history list pages through this (My Reports, employee profiles), so
 * they all show the same page size and order. RLS decides who can read whose.
 */
export const getReportsForAuthor = cache(
  async (
    authorId: string,
    page = 1,
    limit = REPORT_PAGE_SIZE,
  ): Promise<{ reports: DailyReport[]; total: number }> => {
    const supabase = await createClient();
    const offset = (Math.max(1, page) - 1) * limit;

    const { data, error, count } = await supabase
      .from("daily_reports")
      .select(REPORT_SELECT, { count: "exact" })
      .eq("author_id", authorId)
      .order("report_date", { ascending: false })
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error("Failed to load report history.");
    }

    return { reports: (data as DailyReport[]) ?? [], total: count ?? 0 };
  },
);

/** The signed-in person's own report history (see getReportsForAuthor). */
export const getReportHistory = cache(
  async (
    page = 1,
    limit = REPORT_PAGE_SIZE,
  ): Promise<{ reports: DailyReport[]; total: number }> => {
    const user = await getAuthUser();
    if (!user) {
      return { reports: [], total: 0 };
    }
    return getReportsForAuthor(user.id, page, limit);
  },
);

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchReports(query: string): Promise<DailyReport[]> {
  const supabase = await createClient();

  const user = await getAuthUser();

  if (!user) {
    return [];
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const escaped = escapeIlikePattern(trimmed);

  const { data, error } = await supabase.rpc("search_my_reports", {
    search_query: escaped,
  });

  if (error) {
    throw new Error("Failed to search reports.");
  }

  return (data as DailyReport[]) ?? [];
}

export async function getReportByAuthorAndDate(
  authorId: string,
  date: string,
): Promise<DailyReport | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_reports")
    .select(REPORT_SELECT)
    .eq("author_id", authorId)
    .eq("report_date", date)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load report.");
  }

  return (data as DailyReport) ?? null;
}

export const getMyReportById = cache(
  async (id: string): Promise<DailyReport | null> => {
    const supabase = await createClient();

    const user = await getAuthUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("daily_reports")
      .select(REPORT_SELECT)
      .eq("id", id)
      .eq("author_id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load report.");
    }

    return (data as DailyReport) ?? null;
  },
);

export const getReportStatsData = cache(async () => {
  const supabase = await createClient();

  const user = await getAuthUser();

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

/** The date of one report the viewer can read (RLS), for deep links. */
export const getReportDate = cache(
  async (reportId: string): Promise<string | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("daily_reports")
      .select("report_date")
      .eq("id", reportId)
      .maybeSingle();
    return data?.report_date ?? null;
  },
);
