"use server";

import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create";
import { todayInTimezone } from "@/lib/helpers/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One tap of birthday wishes to a teammate, once a day, only on their birthday. */
export async function sendBirthdayWish(
  celebrantId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentProfile();
  if (!me?.organization_id) return { success: false, error: "Not signed in." };
  if (typeof celebrantId !== "string" || !UUID.test(celebrantId) || celebrantId === me.id) {
    return { success: false, error: "Couldn't send that." };
  }

  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const admin = createAdminClient();
  const { data: celebrant } = await admin
    .from("profiles")
    .select("id, organization_id, date_of_birth, is_active, archived_at")
    .eq("id", celebrantId)
    .maybeSingle();

  if (
    !celebrant ||
    celebrant.organization_id !== me.organization_id ||
    !celebrant.is_active ||
    celebrant.archived_at ||
    celebrant.date_of_birth?.slice(5, 10) !== today.slice(5, 10)
  ) {
    return { success: false, error: "It isn't their birthday today." };
  }

  const { error } = await admin.from("birthday_wishes").insert({
    org_id: me.organization_id,
    from_id: me.id,
    to_id: celebrant.id,
    on_date: today,
  });
  if (error) {
    // Unique violation: already wished today. Treat as done.
    if (error.code === "23505") return { success: true };
    return { success: false, error: "Couldn't send your wishes." };
  }

  const name = me.full_name?.trim() || "A teammate";
  await createNotification({
    orgId: me.organization_id,
    profileId: celebrant.id,
    type: "birthday_wish",
    title: `${name} wished you a happy birthday`,
    entityType: "employee",
    entityId: me.id,
  });

  revalidatePath("/");
  return { success: true };
}
