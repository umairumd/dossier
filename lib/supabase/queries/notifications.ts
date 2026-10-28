import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { dateInTimezone, todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { Notification } from "@/types/notification";

// Get recent notifications for current user (last 20)
export const getMyNotifications = cache(async (): Promise<Notification[]> => {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data as Notification[]) ?? [];
});

const FOR_YOU_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Types that only matter on the day they were sent. */
const TODAY_ONLY = new Set(["birthday", "birthday_wish", "report_deadline"]);

/**
 * Uncleared notifications from the last 7 days, newest first, minus the ones
 * whose cause has gone away: a leave request someone already decided, a
 * handbook doc already confirmed, and day-only notices from earlier days.
 * Birthday rows the person already sent wishes for carry `wished`.
 */
export const getForYouNotifications = cache(async (): Promise<Notification[]> => {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return [];

  const since = new Date(Date.now() - FOR_YOU_WINDOW_MS).toISOString();
  const [{ data }, settings] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .is("cleared_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    getOrganizationSettings(),
  ]);
  const notes = (data as Notification[]) ?? [];
  const today = todayInTimezone(settings.timezone);

  const idsOf = (type: string) =>
    [...new Set(notes.flatMap((note) => (note.type === type && note.entity_id ? [note.entity_id] : [])))];
  const leaveIds = idsOf("leave_request_submitted");
  const docSlugs = idsOf("handbook_reminder");
  const hasBirthdays = notes.some((note) => note.type === "birthday");

  const [leaves, docs, acks, wishes] = await Promise.all([
    leaveIds.length
      ? supabase.from("leave_requests").select("id, status").in("id", leaveIds)
      : Promise.resolve({ data: [] as { id: string; status: string }[] }),
    docSlugs.length
      ? supabase.from("handbook_docs").select("id, slug, version").in("slug", docSlugs)
      : Promise.resolve({ data: [] as { id: string; slug: string; version: number }[] }),
    docSlugs.length
      ? supabase.from("handbook_acks").select("doc_id, version").eq("profile_id", user.id)
      : Promise.resolve({ data: [] as { doc_id: string; version: number }[] }),
    hasBirthdays
      ? supabase.from("birthday_wishes").select("to_id").eq("from_id", user.id).eq("on_date", today)
      : Promise.resolve({ data: [] as { to_id: string }[] }),
  ]);

  const decidedLeave = new Set(
    (leaves.data ?? []).filter((row) => row.status !== "pending").map((row) => row.id),
  );
  const ackedVersion = new Map<string, number>();
  for (const row of acks.data ?? []) {
    ackedVersion.set(row.doc_id, Math.max(ackedVersion.get(row.doc_id) ?? 0, row.version));
  }
  const confirmedSlugs = new Set(
    (docs.data ?? [])
      .filter((doc) => (ackedVersion.get(doc.id) ?? 0) >= doc.version)
      .map((doc) => doc.slug),
  );
  const wished = new Set((wishes.data ?? []).map((row) => row.to_id));

  return notes.flatMap((note) => {
    if (TODAY_ONLY.has(note.type) && dateInTimezone(new Date(note.created_at), settings.timezone) !== today) {
      return [];
    }
    if (note.type === "leave_request_submitted" && note.entity_id && decidedLeave.has(note.entity_id)) {
      return [];
    }
    if (note.type === "handbook_reminder" && note.entity_id && confirmedSlugs.has(note.entity_id)) {
      return [];
    }
    if (note.type === "birthday" && note.entity_id && wished.has(note.entity_id)) {
      return [{ ...note, wished: true }];
    }
    return [note];
  });
});

// Get unread count for current user
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .is("read_at", null);

  return count ?? 0;
});
