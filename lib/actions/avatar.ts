"use server";

/**
 * Avatar persistence + reward unlocks.
 * - saveMyAvatar: validates the recipe, drops items the user can't wear, saves profiles.avatar.
 * - syncMyUnlocks: evaluates reward rules against the user's stats, records new unlocks,
 *   returns them so the client can play the "reward.unlocked" moment.
 *
 * TODO(cursor): implement getRewardStats() with the existing stats helpers
 * (lib/helpers/report-stats.ts → computeReportStats, profiles.date_of_birth, join date,
 * manager team-completion history). Everything else here is ready.
 */
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeTimeZone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  type AccessoryId, type AvatarConfig, type RewardStats, evaluateUnlocks, isWearable, sanitizeAvatar,
} from "@/lib/mascot";

async function ownedItems(profileId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("avatar_unlocks").select("item_id").eq("profile_id", profileId);
  return new Set((data ?? []).map((r: { item_id: string }) => r.item_id));
}

export async function saveMyAvatar(input: AvatarConfig): Promise<{ ok: true; avatar: AvatarConfig } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const owned = await ownedItems(user.id);
  const settings = await getOrganizationSettings();
  const avatar = sanitizeAvatar(
    input,
    user.id,
    (id: AccessoryId) => isWearable(id, owned, new Date(), safeTimeZone(settings.timezone)),
  );

  const { error } = await supabase.from("profiles").update({ avatar }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, avatar };
}

/** Call after report submission and on dashboard load (cheap: one select + maybe one insert). */
export async function syncMyUnlocks(): Promise<AccessoryId[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const stats = await getRewardStats(user.id);
  const owned = await ownedItems(user.id);
  const fresh = evaluateUnlocks(stats, owned);
  if (!fresh.length) return [];
  // Unlocks are written with the service role (no client insert policy).
  const admin = createAdminClient();
  const { error } = await admin
    .from("avatar_unlocks")
    .upsert(fresh.map((item_id) => ({ profile_id: user.id, item_id, source: "auto" })), { onConflict: "profile_id,item_id", ignoreDuplicates: true });
  if (error) return [];
  return fresh;
}

/** Item ids in avatar_unlocks for the signed-in person. */
export async function getMyUnlockIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return [...await ownedItems(user.id)];
}

/** Reward stats for the signed-in person. Stub until phase 5 (starters only). */
export async function getMyRewardStats(): Promise<RewardStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getRewardStats("");
  return getRewardStats(user.id);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getRewardStats(_profileId: string): Promise<RewardStats> {
  // TODO(cursor): compute from existing helpers. Placeholder keeps the app working (starter items only).
  return {
    totalReports: 0, onTimeReports: 0, currentStreak: 0, longestStreak: 0,
    perfectWeeks: 0, perfectMonths: 0, tenureDays: 0, isBirthdayToday: false, teamCompleteDays: 0,
  };
}
