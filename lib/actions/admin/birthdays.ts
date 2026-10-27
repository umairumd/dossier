"use server";

import { createNotification } from "@/lib/actions/notifications";
import {
  orgDayUtcBounds,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { createAdminClient } from "@/lib/supabase/admin";

function monthDay(isoDate: string): string {
  return isoDate.slice(5, 10); // "MM-DD"
}

function firstName(fullName: string | null): string {
  const trimmed = fullName?.trim() || "there";
  return trimmed.split(/\s+/)[0] || trimmed;
}

/**
 * Send once-per-org-day birthday notifications for profiles whose DOB
 * month-day matches "today" in the org timezone. Idempotent per recipient
 * within that org-local day. Called from the daily Vercel cron — not from
 * profile DOB saves or the /birthdays page.
 */
export async function sendBirthdayNotifications(
  orgId: string,
): Promise<void> {
  if (!orgId) return;

  const adminClient = createAdminClient();

  // Admin client so this works from cron (no user session).
  const { data: settings } = await adminClient
    .from("organization_settings")
    .select("timezone")
    .eq("id", true)
    .maybeSingle();

  const timezone = settings?.timezone ?? "UTC";
  const today = todayInTimezone(timezone);
  const todayMonthDay = monthDay(today);
  const { startIso, endIso } = orgDayUtcBounds(today, timezone);

  const { data: people, error } = await adminClient
    .from("profiles")
    .select("id, full_name, date_of_birth")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) {
    console.error("[birthdays] Failed to load profiles:", error);
    return;
  }

  const roster = people ?? [];
  const celebrating = roster.filter(
    (person) =>
      person.date_of_birth != null &&
      monthDay(person.date_of_birth) === todayMonthDay,
  );

  if (celebrating.length === 0) {
    return;
  }

  // Idempotency: any birthday notification already created for a recipient
  // during the org-local calendar day (self or teammate notice).
  const { data: existing } = await adminClient
    .from("notifications")
    .select("profile_id, entity_id")
    .eq("org_id", orgId)
    .eq("type", "birthday")
    .in(
      "profile_id",
      roster.map((person) => person.id),
    )
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  const alreadySent = new Set(
    (existing ?? []).map(
      (row) => `${row.profile_id}:${row.entity_id ?? ""}`,
    ),
  );

  const tasks: Promise<unknown>[] = [];

  for (const celebrant of celebrating) {
    const fullName = celebrant.full_name?.trim() || "a teammate";
    const selfKey = `${celebrant.id}:${celebrant.id}`;
    if (!alreadySent.has(selfKey)) {
      tasks.push(
        createNotification({
          orgId,
          profileId: celebrant.id,
          type: "birthday",
          title: `Happy birthday, ${firstName(celebrant.full_name)}!`,
          body: "Have a wonderful day — your team is cheering for you.",
          entityType: "employee",
          entityId: celebrant.id,
        }),
      );
      alreadySent.add(selfKey);
    }

    for (const peer of roster) {
      if (peer.id === celebrant.id) continue;
      const peerKey = `${peer.id}:${celebrant.id}`;
      if (alreadySent.has(peerKey)) continue;
      tasks.push(
        createNotification({
          orgId,
          profileId: peer.id,
          type: "birthday",
          title: `Today is ${fullName}'s birthday`,
          body: "Say hi",
          entityType: "employee",
          entityId: celebrant.id,
        }),
      );
      alreadySent.add(peerKey);
    }
  }

  await Promise.all(tasks);
}
