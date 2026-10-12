import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import type { ActivityLogEntry } from "@/types/activity";

export type ActivityQueryOptions = {
  cursor?: string | null;
  eventTypes?: string[];
  search?: string;
  rangeStartIso?: string | null;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// Postgrest filter builders are deeply generic; keep this helper loosely typed
// so optional cursor/filter chaining does not blow up the type checker.
function applyActivityQueryOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  orgId: string | null | undefined,
  limit: number,
  options?: ActivityQueryOptions,
) {
  let next = query;

  // Scoping to the organisation lets Postgres walk the (org_id, created_at)
  // index newest-first instead of scanning and sorting the whole table.
  if (orgId) {
    next = next.eq("org_id", orgId);
  }

  if (options?.cursor) {
    next = next.lt("created_at", options.cursor);
  }
  if (options?.eventTypes && options.eventTypes.length > 0) {
    next = next.in("event_type", options.eventTypes);
  }
  const search = options?.search?.trim();
  if (search) {
    const escaped = escapeIlikePattern(search);
    next = next.or(
      `actor_name.ilike.%${escaped}%,target_name.ilike.%${escaped}%`,
    );
  }
  if (options?.rangeStartIso) {
    next = next.gte("created_at", options.rangeStartIso);
  }

  return next.order("created_at", { ascending: false }).limit(limit);
}

export const getActivityLog = cache(
  async (
    limit: number,
    options?: ActivityQueryOptions,
  ): Promise<ActivityLogEntry[]> => {
    await requireAdminUser();
    const [supabase, profile] = await Promise.all([
      createClient(),
      getCurrentProfile(),
    ]);

    try {
      const { data, error } = await applyActivityQueryOptions(
        supabase.from("activity_log").select("*"),
        profile?.organization_id,
        limit,
        options,
      );

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
  async (
    limit: number,
    options?: ActivityQueryOptions,
  ): Promise<ActivityLogEntry[]> => {
    const supabase = await createClient();

    try {
      const [user, profile] = await Promise.all([
        getAuthUser(),
        getCurrentProfile(),
      ]);
      if (!user) return [];

      const { data, error } = await applyActivityQueryOptions(
        supabase
          .from("activity_log")
          .select("*")
          .or(`actor_id.eq.${user.id},target_id.eq.${user.id}`),
        profile?.organization_id,
        limit,
        options,
      );

      if (error) return [];
      return (data as ActivityLogEntry[]) ?? [];
    } catch {
      return [];
    }
  },
);

// Manager-scoped version — RLS handles filtering
export const getTeamActivityLog = cache(
  async (
    limit: number,
    options?: ActivityQueryOptions,
  ): Promise<ActivityLogEntry[]> => {
    const [supabase, profile] = await Promise.all([
      createClient(),
      getCurrentProfile(),
    ]);

    try {
      const { data, error } = await applyActivityQueryOptions(
        supabase.from("activity_log").select("*"),
        profile?.organization_id,
        limit,
        options,
      );

      if (error) return [];
      return (data as ActivityLogEntry[]) ?? [];
    } catch {
      return [];
    }
  },
);
