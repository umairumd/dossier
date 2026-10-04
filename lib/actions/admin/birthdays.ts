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

/**
 * Send once-per-org-day birthday notifications for profiles whose DOB
 * month-day matches "today" in the org timezone. Idempotent within that
 * org-local day. Called from the hourly cron — not from profile DOB
 * saves or the /birthdays page.
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
    .is("archived_at", null)
    .not("date_of_birth", "is", null);

  if (error) {
    console.error("[birthdays] Failed to load profiles:", error);
    return;
  }

  const celebrating = (people ?? []).filter(
    (person) =>
      person.date_of_birth != null &&
      monthDay(person.date_of_birth) === todayMonthDay,
  );

  if (celebrating.length === 0) {
    return;
  }

  // Idempotency: birthday notifications already created for these profiles
  // during the org-local calendar day (not UTC midnight–midnight).
  const { data: existing } = await adminClient
    .from("notifications")
    .select("profile_id")
    .eq("org_id", orgId)
    .eq("type", "birthday")
    .in(
      "profile_id",
      celebrating.map((person) => person.id),
    )
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  const alreadySent = new Set(
    (existing ?? []).map((row) => row.profile_id as string),
  );

  await Promise.all(
    celebrating
      .filter((person) => !alreadySent.has(person.id))
      .map((person) => {
        const name = person.full_name?.trim() || "a teammate";
        return createNotification({
          orgId,
          profileId: person.id,
          type: "birthday",
          title: `Today is ${name}'s birthday`,
          entityType: "employee",
          entityId: person.id,
        });
      }),
  );
}
