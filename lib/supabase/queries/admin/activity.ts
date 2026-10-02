import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import type { ActivityLogEntry } from "@/types/activity";

export const getActivityLog = cache(
  async (limit: number): Promise<ActivityLogEntry[]> => {
    await requireAdminUser();
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error("Failed to load activity log.");
      return (data as ActivityLogEntry[]) ?? [];
    } catch {
      // Table may not exist until the migration is applied
      return [];
    }
  },
);

// Personal feed: events where the current user is the actor or the target.
// No role check (members call this); RLS plus the explicit OR filter keep
// it scoped so it is also safe if an owner/admin/manager calls it.
export const getMyActivityLog = cache(
  async (limit: number): Promise<ActivityLogEntry[]> => {
    const supabase = await createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .or(`actor_id.eq.${user.id},target_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return [];
      return (data as ActivityLogEntry[]) ?? [];
    } catch {
      return [];
    }
  },
);

// Manager-scoped version — RLS handles filtering
export const getTeamActivityLog = cache(
  async (limit: number): Promise<ActivityLogEntry[]> => {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return [];
      return (data as ActivityLogEntry[]) ?? [];
    } catch {
      return [];
    }
  },
);
