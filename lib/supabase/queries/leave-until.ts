import { createClient } from "@/lib/supabase/server";
import { shiftReportDate } from "@/lib/helpers/dates";

/** Last consecutive full-day leave date from today, for people on leave today. */
export async function getLeaveUntilByProfile(
  profileIds: string[],
  today: string,
): Promise<Record<string, string>> {
  const ids = [...new Set(profileIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance_records")
    .select("profile_id, date")
    .in("profile_id", ids)
    .eq("status", "leave")
    .gte("date", today)
    .order("date", { ascending: true });

  const byId = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const dates = byId.get(row.profile_id) ?? new Set<string>();
    dates.add(row.date);
    byId.set(row.profile_id, dates);
  }

  const until: Record<string, string> = {};
  for (const [id, dates] of byId) {
    if (!dates.has(today)) continue;
    let cursor = today;
    let last = today;
    while (dates.has(cursor)) {
      last = cursor;
      cursor = shiftReportDate(cursor, 1);
    }
    until[id] = last;
  }
  return until;
}
