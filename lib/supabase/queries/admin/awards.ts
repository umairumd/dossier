import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { GRANTABLE_IDS } from "@/lib/mascot/catalog";

export interface AwardedItem {
  itemId: string;
  awardedAt: string;
  reason: string | null;
  awardedBy: string | null;
}

/** Award-only items someone holds, with who gave them and why. Owners and admins. */
export const getAwardedItems = cache(async (profileId: string): Promise<AwardedItem[]> => {
  // Empty for anyone but owners and admins (the profile page renders for both).
  const me = await getCurrentProfile();
  if (me?.role !== "owner" && me?.role !== "admin") return [];
  const { data } = await createAdminClient()
    .from("avatar_unlocks")
    .select("item_id, unlocked_at, reason, granter:profiles!avatar_unlocks_granted_by_fkey (full_name)")
    .eq("profile_id", profileId)
    .in("item_id", GRANTABLE_IDS);
  return (data ?? []).map((row) => {
    const granter = Array.isArray(row.granter) ? row.granter[0] : row.granter;
    return {
      itemId: row.item_id as string,
      awardedAt: row.unlocked_at as string,
      reason: (row.reason as string | null) ?? null,
      awardedBy: (granter as { full_name?: string } | null)?.full_name ?? null,
    };
  });
});
