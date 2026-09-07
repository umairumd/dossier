import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types/notification";

// Get recent notifications for current user (last 20)
export const getMyNotifications = cache(async (): Promise<Notification[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data as Notification[]) ?? [];
});

// Get unread count for current user
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .is("read_at", null);

  return count ?? 0;
});
