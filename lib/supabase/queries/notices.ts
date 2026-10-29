import { cache } from "react";
import { matchesHandbookAudience } from "@/lib/handbook/audience";
import { todayInTimezone } from "@/lib/helpers/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { resolveNoticeRules } from "@/lib/notices/rules";
import type { HandbookAudience } from "@/types/handbook";
import type { Notice, NoticeKind, NoticeRuleKey, NoticeRuleSetting } from "@/types/notice";
import type { Profile } from "@/types/profile";

const NOTICE_SELECT =
  "id, kind, title, body_md, created_by, target_profile_id, requires_ack, pinned_until, ends_at, published_at, archived_at";

type NoticeRow = {
  id: string;
  kind: NoticeKind;
  title: string;
  body_md: string;
  created_by: string | null;
  target_profile_id: string | null;
  requires_ack: boolean;
  pinned_until: string | null;
  ends_at: string | null;
  published_at: string | null;
  archived_at: string | null;
};

/** Adds audiences, names and the viewer's receipt to rows RLS already allowed. */
async function hydrate(rows: NoticeRow[], viewerId: string): Promise<Notice[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const ids = rows.map((row) => row.id);
  const personIds = [
    ...new Set(rows.flatMap((row) => [row.created_by, row.target_profile_id]).filter(Boolean)),
  ] as string[];
  const [{ data: audienceRows }, { data: receiptRows }, { data: names }] = await Promise.all([
    supabase.from("notice_audiences").select("notice_id, kind, value").in("notice_id", ids),
    supabase
      .from("notice_receipts")
      .select("notice_id, seen_at, dismissed_at, acknowledged_at")
      .eq("profile_id", viewerId)
      .in("notice_id", ids),
    // Names only, for people RLS may not let this viewer read (an owner who
    // posted, for example).
    personIds.length
      ? createAdminClient().from("profiles").select("id, full_name").in("id", personIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const audiencesBy = new Map<string, HandbookAudience[]>();
  for (const row of audienceRows ?? []) {
    const list = audiencesBy.get(row.notice_id) ?? [];
    list.push({ kind: row.kind, value: row.value });
    audiencesBy.set(row.notice_id, list);
  }
  const receipts = new Map((receiptRows ?? []).map((row) => [row.notice_id as string, row]));
  const nameBy = new Map((names ?? []).map((row) => [row.id as string, row.full_name as string]));
  return rows.map((row) => {
    const receipt = receipts.get(row.id);
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      bodyMd: row.body_md,
      createdBy: row.created_by,
      createdByName: row.created_by ? (nameBy.get(row.created_by) ?? null) : null,
      targetProfileId: row.target_profile_id,
      targetName: row.target_profile_id ? (nameBy.get(row.target_profile_id) ?? null) : null,
      requiresAck: row.requires_ack,
      pinnedUntil: row.pinned_until,
      endsAt: row.ends_at,
      publishedAt: row.published_at,
      archivedAt: row.archived_at,
      audiences: audiencesBy.get(row.id) ?? [],
      seenAt: receipt?.seen_at ?? null,
      dismissedAt: receipt?.dismissed_at ?? null,
      acknowledgedAt: receipt?.acknowledged_at ?? null,
    };
  });
}

function audienceSelf(me: Profile) {
  return {
    id: me.id,
    role: me.role,
    designation: me.designation,
    employment_type: me.employment_type,
    is_remote: me.is_remote,
    department_ids: me.department_ids,
    is_supervisor: me.is_supervisor,
  };
}

/** True when an announcement is addressed to this person (not just visible). */
function addressedTo(notice: Notice, me: Profile): boolean {
  if (notice.kind === "personal") return notice.targetProfileId === me.id;
  return matchesHandbookAudience(audienceSelf(me), {
    kind: "policy",
    jdDesignation: null,
    audiences: notice.audiences,
  });
}

/** Notices that belong in this person's For you right now. */
export const getMyForYouNotices = cache(async (): Promise<Notice[]> => {
  const me = await getCurrentProfile();
  if (!me?.organization_id) return [];
  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const supabase = await createClient();
  const { data } = await supabase
    .from("notices")
    .select(NOTICE_SELECT)
    .not("published_at", "is", null)
    .is("archived_at", null)
    .or(`ends_at.is.null,ends_at.gte.${today}`)
    .order("published_at", { ascending: false })
    .limit(40);
  const notices = await hydrate((data ?? []) as NoticeRow[], me.id);
  return notices.filter(
    (notice) =>
      notice.createdBy !== me.id &&
      addressedTo(notice, me) &&
      !notice.dismissedAt &&
      !notice.acknowledgedAt,
  );
});

/** The Announcements page: announcements for this person, their own posts,
 * every post for owners and admins, and personal notices sent to them. */
export const getAnnouncementsFeed = cache(async (): Promise<Notice[]> => {
  const me = await getCurrentProfile();
  if (!me?.organization_id) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notices")
    .select(NOTICE_SELECT)
    .not("published_at", "is", null)
    .is("archived_at", null)
    .order("published_at", { ascending: false })
    .limit(80);
  const leader = me.role === "owner" || me.role === "admin";
  const notices = await hydrate((data ?? []) as NoticeRow[], me.id);
  return notices.filter((notice) =>
    notice.kind === "personal"
      ? notice.targetProfileId === me.id || notice.createdBy === me.id
      : leader || notice.createdBy === me.id || addressedTo(notice, me),
  );
});

/** Personal notices sent to someone, for their profile (RLS limits who sees them). */
export async function getPersonalNoticesFor(profileId: string): Promise<
  (Notice & { ackedAt: string | null })[]
> {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notices")
    .select(NOTICE_SELECT)
    .eq("kind", "personal")
    .eq("target_profile_id", profileId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(30);
  const rows = (data ?? []) as NoticeRow[];
  if (rows.length === 0) return [];
  const notices = await hydrate(rows, user.id);
  // The target's own acknowledgement, read with the service role: the viewer
  // already passed RLS for these notices.
  const { data: acks } = await createAdminClient()
    .from("notice_receipts")
    .select("notice_id, acknowledged_at")
    .eq("profile_id", profileId)
    .in(
      "notice_id",
      rows.map((row) => row.id),
    );
  const ackBy = new Map((acks ?? []).map((row) => [row.notice_id as string, row.acknowledged_at as string | null]));
  return notices.map((notice) => ({ ...notice, ackedAt: ackBy.get(notice.id) ?? null }));
}

export const getNoticeRules = cache(async (): Promise<Record<NoticeRuleKey, NoticeRuleSetting>> => {
  const me = await getCurrentProfile();
  if (!me?.organization_id) return resolveNoticeRules([]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("notice_rules")
    .select("rule, enabled, threshold")
    .eq("organization_id", me.organization_id);
  return resolveNoticeRules(data ?? []);
});
