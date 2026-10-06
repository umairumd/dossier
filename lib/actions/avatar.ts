"use server";

/**
 * Avatar persistence + reward unlocks.
 * - saveMyAvatar: validates the recipe, drops items the user can't wear, saves profiles.avatar.
 * - syncMyUnlocks: evaluates reward rules against the user's stats, records new unlocks,
 *   returns them so the client can play the "reward.unlocked" moment.
 * - getRewardStats stays private. Callers use getMyRewardStats / syncMyUnlocks, which
 *   always load the signed-in profile.
 */
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeTimeZone, shiftReportDate, todayInTimezone } from "@/lib/helpers/dates";
import { buildAttendanceStatusMap } from "@/lib/helpers/report-stats";
import { computeRewardStats } from "@/lib/helpers/reward-stats";
import { getDeadlineContext, getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getTeamReportingRoster } from "@/lib/supabase/queries/manager/team";
import {
  type AccessoryId, type AvatarConfig, type RewardStats, evaluateUnlocks, isWearable, sanitizeAvatar,
} from "@/lib/mascot";
import type { AttendanceStatus } from "@/types/attendance";

const EMPTY_REWARD_STATS: RewardStats = {
  totalReports: 0,
  onTimeReports: 0,
  currentStreak: 0,
  longestStreak: 0,
  perfectWeeks: 0,
  perfectMonths: 0,
  tenureDays: 0,
  isBirthdayToday: false,
  teamCompleteDays: 0,
};

const PAGE_SIZE = 1000;

async function selectPages<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 50_000; from += PAGE_SIZE) {
    const { data, error } = await run(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

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

/** Reward stats for the signed-in person. */
export async function getMyRewardStats(): Promise<RewardStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY_REWARD_STATS;
  return getRewardStats(user.id);
}

async function getRewardStats(profileId: string): Promise<RewardStats> {
  if (!profileId) return EMPTY_REWARD_STATS;
  const supabase = await createClient();
  const settings = await getOrganizationSettings();
  const timeZone = safeTimeZone(settings.timezone);
  const today = todayInTimezone(timeZone);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, created_at, date_of_birth")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) throw new Error("Failed to load reward stats.");
  if (!profile?.created_at) return EMPTY_REWARD_STATS;

  const [reports, attendanceRows] = await Promise.all([
    selectPages<{ report_date: string; submitted_at: string }>((from, to) =>
      supabase
        .from("daily_reports")
        .select("report_date, submitted_at")
        .eq("author_id", profileId)
        .order("report_date", { ascending: true })
        .range(from, to),
    ),
    selectPages<{ date: string; status: AttendanceStatus }>((from, to) =>
      supabase
        .from("attendance_records")
        .select("date, status")
        .eq("profile_id", profileId)
        .order("date", { ascending: true })
        .range(from, to),
    ),
  ]);

  let team: Parameters<typeof computeRewardStats>[0]["team"] = null;
  if (profile.role === "manager") {
    try {
      const roster = await getTeamReportingRoster();
      const ids = roster.map((member) => member.id);
      const start = shiftReportDate(today, -399);
      if (ids.length > 0) {
        const [teamReports, teamAttendance] = await Promise.all([
          selectPages<{ author_id: string; report_date: string }>((from, to) =>
            supabase
              .from("daily_reports")
              .select("author_id, report_date")
              .in("author_id", ids)
              .gte("report_date", start)
              .lte("report_date", today)
              .order("report_date", { ascending: true })
              .range(from, to),
          ),
          selectPages<{ profile_id: string; date: string; status: AttendanceStatus }>(
            (from, to) =>
              supabase
                .from("attendance_records")
                .select("profile_id, date, status")
                .in("profile_id", ids)
                .gte("date", start)
                .lte("date", today)
                .order("date", { ascending: true })
                .range(from, to),
          ),
        ]);
        team = {
          members: roster.map((member) => ({
            id: member.id,
            createdAt: member.created_at,
          })),
          reports: teamReports.map((row) => ({
            authorId: row.author_id,
            reportDate: row.report_date,
          })),
          attendance: teamAttendance.map((row) => ({
            profileId: row.profile_id,
            date: row.date,
            status: row.status,
          })),
        };
      }
    } catch (error) {
      console.error("Failed to load team reward history:", error);
    }
  }

  return computeRewardStats({
    reports,
    attendanceByDate: buildAttendanceStatusMap(attendanceRows),
    workingDays: settings.workingDays,
    deadline: { ...getDeadlineContext(settings), timezone: timeZone },
    timeZone,
    createdAt: profile.created_at,
    dateOfBirth: profile.date_of_birth ?? null,
    team,
  });
}
