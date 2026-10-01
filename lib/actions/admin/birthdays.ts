"use server";

import { createNotification } from "@/lib/actions/notifications";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { createAdminClient } from "@/lib/supabase/admin";

function monthDay(isoDate: string): string {
  return isoDate.slice(5, 10); // "MM-DD"
}

export async function sendBirthdayNotifications(
  orgId: string,
): Promise<void> {
  if (!orgId) return;

  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const todayMonthDay = monthDay(today);

  const adminClient = createAdminClient();

  const { data: people, error } = await adminClient
    .from("profiles")
    .select("id, full_name, date_of_birth")
    .eq("organization_id", orgId)
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

  // Idempotency: birthday notifications already created for these profiles today.
  const { data: existing } = await adminClient
    .from("notifications")
    .select("profile_id")
    .eq("org_id", orgId)
    .eq("type", "birthday")
    .in(
      "profile_id",
      celebrating.map((person) => person.id),
    )
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lt("created_at", `${today}T23:59:59.999Z`);

  const alreadySent = new Set(
    (existing ?? []).map((row) => row.profile_id as string),
  );

  await Promise.all(
    celebrating
      .filter((person) => !alreadySent.has(person.id))
      .map((person) =>
        createNotification({
          orgId,
          profileId: person.id,
          type: "birthday",
          title: `🎂 Happy Birthday, ${person.full_name?.trim() || "there"}!`,
          entityType: "employee",
          entityId: person.id,
        }),
      ),
  );
}
