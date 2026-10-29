"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/helpers/activity-log";
import { isValidDateString, todayInTimezone } from "@/lib/helpers/dates";
import { matchesHandbookAudience, normaliseAudiences } from "@/lib/handbook/audience";
import { createNotification } from "@/lib/notifications/create";
import { notifyGrouped } from "@/lib/notifications/grouped";
import { getPostingRights, loadAudiencePool } from "@/lib/notices/server";
import { NOTICE_RULES, isNoticeRuleKey } from "@/lib/notices/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { HandbookAudience, HandbookAudienceKind } from "@/types/handbook";
import type { NoticeKind } from "@/types/notice";

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIENCE_KINDS: HandbookAudienceKind[] = [
  "everyone",
  "department",
  "role",
  "designation",
  "employment_type",
  "work_location",
  "profile",
];

function revalidateNotices() {
  revalidatePath("/");
  revalidatePath("/announcements");
}

export type PostNoticeInput = {
  kind: NoticeKind;
  title: string;
  bodyMd: string;
  audiences: HandbookAudience[];
  targetProfileId: string | null;
  requiresAck: boolean;
  pinnedUntil: string | null;
  endsAt: string | null;
  notify: boolean;
};

export async function postNotice(input: PostNoticeInput): Promise<Result<{ id: string; reached: number }>> {
  const me = await getCurrentProfile();
  if (!me?.organization_id) return { success: false, error: "Not signed in." };
  const orgId = me.organization_id;

  const kind = input?.kind;
  if (kind !== "announcement" && kind !== "personal") return { success: false, error: "Choose a type." };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const bodyMd = typeof input.bodyMd === "string" ? input.bodyMd.trim() : "";
  if (!title) return { success: false, error: "Add a title." };
  if (title.length > 160) return { success: false, error: "Keep the title under 160 characters." };
  if (bodyMd.length > 5000) return { success: false, error: "Keep the message under 5,000 characters." };

  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const pinnedUntil = kind === "announcement" && isValidDateString(input.pinnedUntil) ? input.pinnedUntil : null;
  const endsAt = kind === "announcement" && isValidDateString(input.endsAt) ? input.endsAt : null;
  if (pinnedUntil && pinnedUntil < today) return { success: false, error: "Pin until a date from today on." };
  if (endsAt && endsAt < today) return { success: false, error: "Choose an end date from today on." };

  const rights = await getPostingRights(me);
  const pool = await loadAudiencePool(orgId);
  const admin = createAdminClient();

  let audiences: HandbookAudience[] = [];
  let targetId: string | null = null;
  let recipients: string[] = [];

  if (kind === "personal") {
    targetId = typeof input.targetProfileId === "string" && UUID.test(input.targetProfileId) ? input.targetProfileId : null;
    const target = targetId ? pool.find((person) => person.id === targetId) : null;
    if (!target || target.id === me.id) return { success: false, error: "Choose who it's for." };
    if (!rights.all && !rights.personIds.includes(target.id)) {
      return { success: false, error: "You can only send personal notices to your own team." };
    }
    recipients = [target.id];
  } else {
    audiences = normaliseAudiences(
      (Array.isArray(input.audiences) ? input.audiences : []).filter(
        (rule): rule is HandbookAudience =>
          Boolean(rule) && AUDIENCE_KINDS.includes(rule.kind) && (rule.value == null || typeof rule.value === "string"),
      ),
    );
    if (audiences.length === 0) return { success: false, error: "Choose who sees it." };
    if (!rights.all) {
      const allowed = audiences.every(
        (rule) => rule.kind === "department" && rule.value != null && rights.departmentIds.includes(rule.value),
      );
      if (!allowed) return { success: false, error: "You can post to the departments you manage." };
    }
    recipients = pool
      .filter(
        (person) =>
          person.id !== me.id &&
          matchesHandbookAudience(person, { kind: "policy", jdDesignation: null, audiences }),
      )
      .map((person) => person.id);
  }

  const { data: inserted, error } = await admin
    .from("notices")
    .insert({
      organization_id: orgId,
      kind,
      title,
      body_md: bodyMd,
      created_by: me.id,
      target_profile_id: targetId,
      requires_ack: kind === "personal" ? true : Boolean(input.requiresAck),
      pinned_until: pinnedUntil,
      ends_at: endsAt,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !inserted) return { success: false, error: "Couldn't post that." };

  if (audiences.length > 0) {
    const { error: audienceError } = await admin
      .from("notice_audiences")
      .insert(audiences.map((rule) => ({ notice_id: inserted.id, kind: rule.kind, value: rule.value })));
    if (audienceError) {
      await admin.from("notices").delete().eq("id", inserted.id);
      return { success: false, error: "Couldn't post that." };
    }
  }

  const author = me.full_name?.trim() || "Someone";
  if (kind === "personal" || input.notify) {
    await notifyGrouped(admin, {
      orgId,
      recipientIds: recipients,
      type: "notice_posted",
      entityType: "notice",
      entityId: inserted.id,
      title: () => (kind === "personal" ? `${author} sent you a notice` : title),
      body: () => (kind === "personal" ? title : `Posted by ${author}`),
    });
  }

  const target = targetId ? pool.find((person) => person.id === targetId) : null;
  await logActivity({
    orgId,
    eventType: "notice_posted",
    actorId: me.id,
    actorName: me.full_name,
    targetId: target?.id,
    targetName: target?.full_name,
    entityType: "notice",
    entityId: inserted.id,
    // Personal notices keep their title out of the activity log.
    entityName: kind === "announcement" ? title : undefined,
  });

  revalidateNotices();
  if (targetId) revalidatePath(`/employees/${targetId}`);
  return { success: true, id: inserted.id, reached: recipients.length };
}

async function canManage(noticeId: string) {
  const me = await getCurrentProfile();
  if (!me?.organization_id || !UUID.test(noticeId)) return null;
  const { data: notice } = await createAdminClient()
    .from("notices")
    .select("id, organization_id, created_by, kind, target_profile_id, title")
    .eq("id", noticeId)
    .maybeSingle();
  if (!notice || notice.organization_id !== me.organization_id) return null;
  const leader = me.role === "owner" || me.role === "admin";
  if (!leader && notice.created_by !== me.id) return null;
  return { me, notice };
}

export async function archiveNotice(noticeId: string): Promise<Result> {
  const allowed = await canManage(noticeId);
  if (!allowed) return { success: false, error: "You can't remove this one." };
  const { error } = await createAdminClient()
    .from("notices")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", noticeId);
  if (error) return { success: false, error: "Couldn't remove it." };
  revalidateNotices();
  if (allowed.notice.target_profile_id) revalidatePath(`/employees/${allowed.notice.target_profile_id}`);
  return { success: true };
}

/** Records the viewer's own state; RLS checks they can read the notice. */
async function writeReceipt(
  noticeId: string,
  patch: { dismissed_at?: string; acknowledged_at?: string },
): Promise<boolean> {
  const me = await getCurrentProfile();
  if (!me || !UUID.test(noticeId)) return false;
  const supabase = await createClient();
  const { error } = await supabase
    .from("notice_receipts")
    .upsert({ notice_id: noticeId, profile_id: me.id, ...patch }, { onConflict: "notice_id,profile_id" });
  return !error;
}

export async function markNoticesSeen(noticeIds: string[]): Promise<void> {
  const me = await getCurrentProfile();
  if (!me || !Array.isArray(noticeIds)) return;
  const ids = noticeIds.filter((id) => typeof id === "string" && UUID.test(id)).slice(0, 50);
  if (ids.length === 0) return;
  const supabase = await createClient();
  // Insert only: seen_at keeps the first time.
  await supabase
    .from("notice_receipts")
    .upsert(
      ids.map((id) => ({ notice_id: id, profile_id: me.id })),
      { onConflict: "notice_id,profile_id", ignoreDuplicates: true },
    );
}

export async function dismissNotice(noticeId: string): Promise<Result> {
  const ok = await writeReceipt(noticeId, { dismissed_at: new Date().toISOString() });
  if (!ok) return { success: false, error: "Couldn't dismiss it." };
  revalidateNotices();
  return { success: true };
}

export async function acknowledgeNotice(noticeId: string): Promise<Result> {
  const me = await getCurrentProfile();
  if (!me?.organization_id) return { success: false, error: "Not signed in." };
  const ok = await writeReceipt(noticeId, { acknowledged_at: new Date().toISOString() });
  if (!ok) return { success: false, error: "Couldn't record that." };

  const { data: notice } = await createAdminClient()
    .from("notices")
    .select("id, kind, title, created_by, target_profile_id")
    .eq("id", noticeId)
    .maybeSingle();
  if (notice?.kind === "personal" && notice.target_profile_id === me.id) {
    if (notice.created_by && notice.created_by !== me.id) {
      await createNotification({
        orgId: me.organization_id,
        profileId: notice.created_by,
        type: "notice_acknowledged",
        title: `${me.full_name?.trim() || "Someone"} acknowledged your note`,
        body: `“${notice.title}”`,
        entityType: "employee",
        entityId: me.id,
      });
    }
    await logActivity({
      orgId: me.organization_id,
      eventType: "notice_acknowledged",
      actorId: me.id,
      actorName: me.full_name,
      entityType: "notice",
      entityId: notice.id,
    });
  }
  revalidateNotices();
  return { success: true };
}

export async function dismissAutoNotice(key: string): Promise<Result> {
  const me = await getCurrentProfile();
  if (!me || typeof key !== "string" || key.length > 120) return { success: false, error: "Couldn't dismiss it." };
  // Only dismissible rules can be dismissed.
  // Heads-ups and team or organisation summaries can be dismissed (summaries
  // for the day: their key ends in the date). Your own problems can't.
  if (!/^(leave_low|late_often):/.test(key) && !/:\d{4}-\d{2}-\d{2}$/.test(key)) {
    return { success: false, error: "This one goes away when it's fixed." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("notice_rule_dismissals")
    .upsert({ profile_id: me.id, key }, { onConflict: "profile_id,key" });
  if (error) return { success: false, error: "Couldn't dismiss it." };
  revalidatePath("/");
  return { success: true };
}

export type SeenByRow = {
  id: string;
  name: string;
  avatar: unknown | null;
  designation: string | null;
  seenAt: string | null;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
};

/** Who a notice reached and what they did. The author, owners and admins only. */
export async function getNoticeSeenBy(noticeId: string): Promise<Result<{ rows: SeenByRow[]; requiresAck: boolean }>> {
  const allowed = await canManage(noticeId);
  if (!allowed) return { success: false, error: "Only the author, owners and admins can see this." };
  const { me, notice } = allowed;
  const admin = createAdminClient();
  const [pool, { data: audienceRows }, { data: receipts }, { data: full }] = await Promise.all([
    loadAudiencePool(me.organization_id!),
    admin.from("notice_audiences").select("kind, value").eq("notice_id", noticeId),
    admin
      .from("notice_receipts")
      .select("profile_id, seen_at, dismissed_at, acknowledged_at")
      .eq("notice_id", noticeId),
    admin.from("notices").select("requires_ack").eq("id", noticeId).maybeSingle(),
  ]);
  const audiences = (audienceRows ?? []) as HandbookAudience[];
  const people =
    notice.kind === "personal"
      ? pool.filter((person) => person.id === notice.target_profile_id)
      : pool.filter(
          (person) =>
            person.id !== notice.created_by &&
            matchesHandbookAudience(person, { kind: "policy", jdDesignation: null, audiences }),
        );
  const byId = new Map((receipts ?? []).map((row) => [row.profile_id as string, row]));
  const rows = people
    .map((person) => {
      const receipt = byId.get(person.id);
      return {
        id: person.id,
        name: person.full_name,
        avatar: person.avatar,
        designation: person.designation,
        seenAt: receipt?.seen_at ?? null,
        acknowledgedAt: receipt?.acknowledged_at ?? null,
        dismissedAt: receipt?.dismissed_at ?? null,
      };
    })
    .sort((a, b) => Number(Boolean(b.seenAt)) - Number(Boolean(a.seenAt)) || a.name.localeCompare(b.name));
  return { success: true, rows, requiresAck: Boolean(full?.requires_ack) };
}

export async function saveNoticeRules(
  rules: { rule: string; enabled: boolean; threshold: number | null }[],
): Promise<Result> {
  const me = await getCurrentProfile();
  if (!me?.organization_id || (me.role !== "owner" && me.role !== "admin")) {
    return { success: false, error: "Only owners and admins can change these." };
  }
  if (!Array.isArray(rules)) return { success: false, error: "Nothing to save." };
  const rows = rules.flatMap((row) => {
    if (!row || !isNoticeRuleKey(row.rule)) return [];
    const def = NOTICE_RULES.find((item) => item.rule === row.rule)!;
    const threshold =
      def.defaultThreshold == null || typeof row.threshold !== "number" || !Number.isFinite(row.threshold)
        ? null
        : Math.min(def.max ?? 60, Math.max(def.min ?? 1, Math.round(row.threshold)));
    return [
      {
        organization_id: me.organization_id!,
        rule: row.rule,
        enabled: Boolean(row.enabled),
        threshold,
        updated_by: me.id,
        updated_at: new Date().toISOString(),
      },
    ];
  });
  if (rows.length === 0) return { success: false, error: "Nothing to save." };
  const { error } = await createAdminClient()
    .from("notice_rules")
    .upsert(rows, { onConflict: "organization_id,rule" });
  if (error) return { success: false, error: "Couldn't save the settings." };
  await logActivity({
    orgId: me.organization_id,
    eventType: "org_settings_changed",
    actorId: me.id,
    actorName: me.full_name,
    metadata: { field: "automatic notices" },
  });
  revalidatePath("/organization");
  revalidatePath("/");
  return { success: true };
}
