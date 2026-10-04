"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/notification";

// Mark all notifications as read for current user
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("read_at", null);

  revalidatePath("/", "layout");
}

export async function deleteNotification(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notifications").delete().eq("id", id);

  revalidatePath("/", "layout");
}

export async function clearAllNotifications(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notifications").delete().eq("profile_id", user.id);

  revalidatePath("/", "layout");
}

// Create a notification (called from other server actions via admin client)
// This is a helper used internally, not called from client
export async function createNotification(params: {
  orgId: string;
  profileId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("notifications").insert({
    org_id: params.orgId,
    profile_id: params.profileId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
  });

  if (error) {
    console.error("[notifications] Failed to create notification:", error);
    throw new Error(error.message);
  }
}
