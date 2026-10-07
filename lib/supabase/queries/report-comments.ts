import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

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
