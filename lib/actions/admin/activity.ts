"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnerUser } from "@/lib/supabase/require-admin";
import {
  getActivityLog,
  getMyActivityLog,
  getTeamActivityLog,
  type ActivityQueryOptions,
} from "@/lib/supabase/queries/admin/activity";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  EVENT_CATEGORY,
  type ActivityCategory,
} from "@/lib/helpers/activity-categories";
import type { ActivityEventType, ActivityPageResult } from "@/types/activity";

const PAGE_SIZE = 30;

type CategoryFilter = "all" | ActivityCategory;
type RangeFilter = "week" | "month" | "all";

/** Start of the current week (Monday) or month in the runtime's local time. */
function rangeStartMs(range: RangeFilter): number | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  const daysSinceMonday = (now.getDay() + 6) % 7;
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysSinceMonday,
  ).getTime();
}

function eventTypesForCategory(category: CategoryFilter): string[] | undefined {
  if (category === "all") return undefined;
  return (
    Object.entries(EVENT_CATEGORY) as [ActivityEventType, ActivityCategory][]
  )
    .filter(([, cat]) => cat === category)
    .map(([type]) => type);
}

export async function loadActivityPage(input: {
  cursor?: string | null;
  category?: CategoryFilter;
  range?: RangeFilter;
  query?: string;
}): Promise<ActivityPageResult> {
  const profile = await getCurrentProfile();
  const isOwnerOrAdmin =
    profile?.role === "owner" || profile?.role === "admin";
  const isManager = profile?.role === "manager";

  const category = input.category ?? "all";
  const range = input.range ?? "all";
  const startMs = rangeStartMs(range);

  const options: ActivityQueryOptions = {
    cursor: input.cursor ?? null,
    eventTypes: eventTypesForCategory(category),
    search: input.query?.trim() || undefined,
    rangeStartIso: startMs === null ? null : new Date(startMs).toISOString(),
  };

  const items = isOwnerOrAdmin
    ? await getActivityLog(PAGE_SIZE, options)
    : isManager
      ? await getTeamActivityLog(PAGE_SIZE, options)
      : await getMyActivityLog(PAGE_SIZE, options);

  const hasMore = items.length === PAGE_SIZE;
  const nextCursor = hasMore ? items[items.length - 1]!.created_at : null;

  return { items, nextCursor, hasMore };
}

export async function deleteActivityEntry(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  // Authorization first: the service-role client below bypasses RLS.
  await requireOwnerUser();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("activity_log")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: "Entry not found." };
  }
  revalidatePath("/activity");
  revalidatePath("/");
  return { success: true };
}
