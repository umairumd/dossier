import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DailyReport } from "@/types/report";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Only checks whether *today's* report exists (for the dashboard's status
// card and to disable the submit action) — not report history, which is a
// separate, later milestone.
export const getTodayReport = cache(async (): Promise<DailyReport | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("daily_reports")
    .select(
      "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at",
    )
    .eq("author_id", user.id)
    .eq("report_date", todayDateString())
    .maybeSingle();

  return (data as DailyReport) ?? null;
});
