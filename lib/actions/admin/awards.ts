"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { createNotification } from "@/lib/notifications/create";
import { logActivity } from "@/lib/helpers/activity-log";
import { ACCESSORIES, GRANTABLE_IDS, type AccessoryId } from "@/lib/mascot/catalog";

type ActionResult = { success: boolean; error?: string };

function isGrantable(itemId: string): itemId is AccessoryId {
  return (GRANTABLE_IDS as string[]).includes(itemId);
}

/** The target must be an active person in the admin's organization. */
async function loadTarget(profileId: string) {
  const me = await getCurrentProfile();
  if (!me?.organization_id) return { me: null, target: null };
  const { data: target } = await createAdminClient()
    .from("profiles")
    .select("id, full_name, organization_id, avatar")
    .eq("id", profileId)
    .maybeSingle();
  if (!target || target.organization_id !== me.organization_id) return { me, target: null };
  return { me, target };
}

/** Give someone an award-only buddy item, with a reason they'll see. */
export async function awardItem(
  profileId: string,
  itemId: string,
  reason: string,
): Promise<ActionResult> {
  await requireAdminUser();
  if (!isGrantable(itemId)) return { success: false, error: "That item can't be awarded." };
  const note = reason.trim();
  if (!note) return { success: false, error: "Say why you're awarding it." };
  if (note.length > 300) return { success: false, error: "Keep the reason under 300 characters." };

  const { me, target } = await loadTarget(profileId);
  if (!me || !target) return { success: false, error: "Employee not found in your organization." };
  if (target.id === me.id) return { success: false, error: "You can't award yourself." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("avatar_unlocks")
    .select("item_id")
    .eq("profile_id", target.id)
    .eq("item_id", itemId)
    .maybeSingle();
  if (existing) return { success: false, error: "They already have it." };

  const { error } = await admin.from("avatar_unlocks").insert({
    profile_id: target.id,
    item_id: itemId,
    source: "grant",
    granted_by: me.id,
    reason: note,
  });
  if (error) return { success: false, error: "Couldn't award the item." };

  const label = ACCESSORIES[itemId].label;
  await Promise.all([
    createNotification({
      orgId: me.organization_id!,
      profileId: target.id,
      type: "item_awarded",
      title: `${me.full_name ?? "The team"} awarded you the ${label}`,
      body: note,
      entityType: "buddy_item",
      entityId: itemId,
    }),
    logActivity({
      orgId: me.organization_id!,
      eventType: "item_awarded",
      actorId: me.id,
      actorName: me.full_name ?? undefined,
      targetId: target.id,
      targetName: target.full_name,
      entityType: "buddy_item",
      entityName: label,
      metadata: { item_id: itemId, reason: note },
    }),
  ]);

  revalidatePath(`/employees/${target.id}`);
  return { success: true };
}

/** Take an awarded item back: it leaves their wardrobe and comes off their buddy. */
export async function revokeAwardedItem(profileId: string, itemId: string): Promise<ActionResult> {
  await requireAdminUser();
  if (!isGrantable(itemId)) return { success: false, error: "That item can't be awarded." };

  const { me, target } = await loadTarget(profileId);
  if (!me || !target) return { success: false, error: "Employee not found in your organization." };

  const admin = createAdminClient();
  const { data: removed, error } = await admin
    .from("avatar_unlocks")
    .delete()
    .eq("profile_id", target.id)
    .eq("item_id", itemId)
    .eq("source", "grant")
    .select("item_id");
  if (error) return { success: false, error: "Couldn't take it back." };
  if (!removed || removed.length === 0) return { success: false, error: "They don't have it." };

  // Unequip it if they're wearing it.
  const avatar = target.avatar as { accessories?: Record<string, string> } | null;
  const slot = ACCESSORIES[itemId].slot;
  if (avatar?.accessories?.[slot] === itemId) {
    const accessories = { ...avatar.accessories };
    delete accessories[slot];
    await admin.from("profiles").update({ avatar: { ...avatar, accessories } }).eq("id", target.id);
  }

  await logActivity({
    orgId: me.organization_id!,
    eventType: "item_revoked",
    actorId: me.id,
    actorName: me.full_name ?? undefined,
    targetId: target.id,
    targetName: target.full_name,
    entityType: "buddy_item",
    entityName: ACCESSORIES[itemId].label,
    metadata: { item_id: itemId },
  });

  revalidatePath(`/employees/${target.id}`);
  revalidatePath("/", "layout");
  return { success: true };
}
