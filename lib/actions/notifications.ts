"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", user.id);

  revalidatePath("/", "layout");
}

/** Hide one For you row. Sets cleared_at, and read_at only when it is still null. */
export async function clearNotification(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date().toISOString();
  await supabase
    .from("notifications")
    .update({ cleared_at: now })
    .eq("id", id)
    .eq("profile_id", user.id);
  await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("id", id)
    .eq("profile_id", user.id)
    .is("read_at", null);

  revalidatePath("/", "layout");
}

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
