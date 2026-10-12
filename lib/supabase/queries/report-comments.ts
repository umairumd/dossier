import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportComment } from "@/types/report";

/** Comment totals for the given report ids. Missing ids mean zero. */
export const getReportCommentCounts = cache(
  async (reportIds: string[]): Promise<Record<string, number>> => {
    if (reportIds.length === 0) return {};

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("report_comments")
      .select("report_id")
      .in("report_id", reportIds);

    if (error) {
      throw new Error("Failed to load comment counts.");
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = row.report_id as string;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  },
);

type CommentAuthor = NonNullable<ReportComment["profiles"]>;

type CommentQueryRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  report_id: string;
  profiles: CommentAuthor | CommentAuthor[] | null;
};

/**
 * Comments for several reports in one query, oldest first, keyed by report
 * id. Every requested id is present (an empty list means no comments), so a
 * report sheet given this map can show its comments the moment it opens.
 */
export const getCommentsForReports = cache(
  async (reportIds: string[]): Promise<Record<string, ReportComment[]>> => {
    const byReport: Record<string, ReportComment[]> = Object.fromEntries(
      reportIds.map((id) => [id, [] as ReportComment[]]),
    );
    if (reportIds.length === 0) return byReport;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("report_comments")
      .select(
        "id, body, created_at, author_id, report_id, profiles!report_comments_author_id_fkey(id, full_name, avatar_url, avatar)",
      )
      .in("report_id", reportIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getCommentsForReports error:", error);
      return byReport;
    }

    const rows = (data ?? []) as unknown as CommentQueryRow[];
    const comments: ReportComment[] = rows.map((row) => ({
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      profiles: Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : (row.profiles ?? null),
    }));

    // The author embed is null when profiles RLS hides the author. Fill the
    // display fields only for comments this caller can already read.
    const missingAuthorIds = [
      ...new Set(rows.filter((row, i) => row.author_id && !comments[i].profiles).map((row) => row.author_id)),
    ];
    if (missingAuthorIds.length > 0) {
      const { data: authors } = await createAdminClient()
        .from("profiles")
        .select("id, full_name, avatar_url, avatar")
        .in("id", missingAuthorIds);
      const byId = new Map(((authors ?? []) as CommentAuthor[]).map((a) => [a.id, a]));
      rows.forEach((row, i) => {
        if (!comments[i].profiles) comments[i].profiles = byId.get(row.author_id) ?? null;
      });
    }

    rows.forEach((row, i) => {
      (byReport[row.report_id] ??= []).push(comments[i]);
    });
    return byReport;
  },
);
