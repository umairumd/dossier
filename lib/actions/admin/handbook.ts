"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  getHandbookAcks,
  getHandbookPeoplePool,
} from "@/lib/supabase/queries/admin/handbook";
import { logActivity } from "@/lib/helpers/activity-log";
import { orgDayUtcBounds, todayInTimezone } from "@/lib/helpers/dates";
import { notifyGrouped } from "@/lib/notifications/grouped";
import {
  matchesHandbookAudience,
  normaliseAudiences,
} from "@/lib/handbook/audience";
import { HANDBOOK_KINDS, slugify } from "@/lib/handbook/format";
import { computeReadProgress } from "@/lib/handbook/progress";
import type {
  HandbookAudience,
  HandbookAudienceKind,
  HandbookKind,
} from "@/types/handbook";

export interface HandbookDraftInput {
  id?: string;
  title: string;
  kind: HandbookKind;
  summary: string;
  draftMd: string;
  jdDesignation: string;
  requiresAck: boolean;
  startHere: boolean;
  audiences: HandbookAudience[];
}

type ActionResult = { success: boolean; error?: string };

const MAX_BODY_LENGTH = 200_000;

const AUDIENCE_VALUES: Partial<Record<HandbookAudienceKind, string[]>> = {
  role: ["owner", "admin", "manager", "supervisor", "member"],
  employment_type: ["full_time", "part_time"],
  work_location: ["remote", "on_site"],
};

function validateDraft(input: HandbookDraftInput): string | null {
  const title = input.title.trim();
  if (!title) return "Give the document a title.";
  if (title.length > 160) return "Keep the title under 160 characters.";
  if (!HANDBOOK_KINDS.includes(input.kind)) return "Pick a kind.";
  if (input.draftMd.length > MAX_BODY_LENGTH) return "The text is too long.";
  if (input.summary.trim().length > 300) return "Keep the summary under 300 characters.";
  for (const rule of input.audiences) {
    const allowed = AUDIENCE_VALUES[rule.kind];
    if (allowed && !allowed.includes(rule.value ?? "")) {
      return "One of the audience rules isn't valid.";
    }
  }
  return null;
}

function revalidateHandbook(id?: string) {
  revalidatePath("/organization/handbook");
  revalidatePath("/organization");
  if (id) revalidatePath(`/organization/handbook/${id}`);
  revalidatePath("/handbook", "layout");
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
): Promise<string> {
  const base = slugify(title) || "document";
  const { data } = await supabase
    .from("handbook_docs")
    .select("slug")
    .like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((row) => row.slug as string));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Writes the draft, settings and audiences. Returns the doc id. */
async function writeDraft(
  input: HandbookDraftInput,
): Promise<{ success: true; id: string; slug: string } | { success: false; error: string }> {
  const validation = validateDraft(input);
  if (validation) return { success: false, error: validation };

  const me = await getCurrentProfile();
  if (!me?.organization_id) return { success: false, error: "No organization found." };

  const supabase = await createClient();
  const audiences = normaliseAudiences(input.audiences);
  const fields = {
    title: input.title.trim(),
    kind: input.kind,
    summary: input.summary.trim() || null,
    draft_md: input.draftMd,
    jd_designation: input.kind === "jd" ? input.jdDesignation.trim() || null : null,
    requires_ack: input.requiresAck,
    start_here: input.startHere,
  };

  let id = input.id;
  let slug: string;

  if (id) {
    const { data, error } = await supabase
      .from("handbook_docs")
      .update(fields)
      .eq("id", id)
      .is("archived_at", null)
      .select("slug")
      .maybeSingle();
    if (error || !data) {
      return { success: false, error: "Couldn't save the document." };
    }
    slug = data.slug;
    const { error: clearError } = await supabase
      .from("handbook_doc_audiences")
      .delete()
      .eq("doc_id", id);
    if (clearError) {
      return { success: false, error: "Couldn't save who can see it." };
    }
  } else {
    slug = await uniqueSlug(supabase, fields.title);
    const { data, error } = await supabase
      .from("handbook_docs")
      .insert({
        ...fields,
        organization_id: me.organization_id,
        slug,
        owner_id: me.id,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      return { success: false, error: "Couldn't create the document." };
    }
    id = data.id as string;
  }

  if (audiences.length > 0) {
    const { error } = await supabase
      .from("handbook_doc_audiences")
      .insert(audiences.map((rule) => ({ doc_id: id, kind: rule.kind, value: rule.value })));
    if (error) {
      return { success: false, error: "Couldn't save who can see it." };
    }
  }

  return { success: true, id: id!, slug };
}

export async function saveHandbookDraft(
  input: HandbookDraftInput,
): Promise<ActionResult & { id?: string }> {
  await requireAdminUser();
  const result = await writeDraft(input);
  if (!result.success) return result;
  revalidateHandbook(result.id);
  return { success: true, id: result.id };
}

export async function publishHandbookDoc(
  input: HandbookDraftInput & { changeNote: string },
): Promise<
  ActionResult & { id?: string; version?: number; notified?: number; launched?: boolean }
> {
  await requireAdminUser();
  const me = await getCurrentProfile();
  if (!me?.organization_id) return { success: false, error: "No organization found." };

  const supabase = await createClient();
  const changeNote = input.changeNote.trim();

  let currentVersion = 0;
  if (input.id) {
    const { data } = await supabase
      .from("handbook_docs")
      .select("version, archived_at")
      .eq("id", input.id)
      .maybeSingle();
    if (!data || data.archived_at) {
      return { success: false, error: "Document not found." };
    }
    currentVersion = data.version;
  }
  if (currentVersion > 0 && !changeNote) {
    return { success: false, error: "Say what changed in this version." };
  }
  if (changeNote.length > 500) {
    return { success: false, error: "Keep the change note under 500 characters." };
  }
  if (!input.draftMd.trim()) {
    return { success: false, error: "Write something before publishing." };
  }

  const saved = await writeDraft(input);
  if (!saved.success) return saved;

  const version = currentVersion + 1;
  const { data: published, error } = await supabase
    .from("handbook_docs")
    .update({
      body_md: input.draftMd,
      version,
      change_note: changeNote || null,
      published_at: new Date().toISOString(),
      published_by: me.id,
    })
    .eq("id", saved.id)
    .eq("version", currentVersion)
    .select("id")
    .maybeSingle();

  if (error || !published) {
    return {
      success: false,
      error: "Someone else published this document just now. Reload and try again.",
    };
  }

  const title = input.title.trim();
  const audiences = normaliseAudiences(input.audiences);
  const [people, settings] = await Promise.all([
    getHandbookPeoplePool(),
    getOrganizationSettings(),
  ]);
  const launched = Boolean(settings.handbookLaunchedAt);
  const recipientIds = people
    .filter((person) =>
      matchesHandbookAudience(person, {
        kind: input.kind,
        jdDesignation: input.kind === "jd" ? input.jdDesignation : null,
        audiences,
      }),
    )
    .map((person) => person.id)
    .filter((id) => id !== me.id);

  // Before launch only owners and admins can read the handbook, so nobody
  // is notified; launching sends one notification instead.
  await Promise.all([
    launched
      ? notifyGrouped(createAdminClient(), {
      orgId: me.organization_id,
      recipientIds,
      type: "handbook_published",
      entityType: "handbook_doc",
      entityId: saved.slug,
      title: () =>
        version === 1 ? `New in the handbook: ${title}` : `${title} was updated`,
      body: () =>
        changeNote ||
        (input.requiresAck ? "Please read it and confirm." : input.summary.trim() || null),
    })
      : Promise.resolve(),
    logActivity({
      orgId: me.organization_id,
      eventType: "handbook_published",
      actorId: me.id,
      actorName: me.full_name,
      entityType: "handbook_doc",
      entityId: saved.id,
      entityName: title,
      metadata: { version, kind: input.kind, change_note: changeNote || null },
    }),
  ]);

  revalidateHandbook(saved.id);
  return {
    success: true,
    id: saved.id,
    version,
    notified: launched ? recipientIds.length : 0,
    launched,
  };
}

/** People who can read at least one published doc: who launching notifies. */
async function launchRecipients(meId: string): Promise<string[]> {
  const supabase = await createClient();
  const [people, { data: docs }] = await Promise.all([
    getHandbookPeoplePool(),
    supabase
      .from("handbook_docs")
      .select("kind, jd_designation, handbook_doc_audiences (kind, value)")
      .gt("version", 0)
      .is("archived_at", null),
  ]);
  const published = (docs ?? []).map((doc) => ({
    kind: doc.kind as HandbookKind,
    jdDesignation: doc.jd_designation as string | null,
    audiences: (doc.handbook_doc_audiences ?? []) as HandbookAudience[],
  }));
  return people
    .filter(
      (person) =>
        person.id !== meId &&
        (person.role === "owner" ||
          person.role === "admin" ||
          published.some((doc) => matchesHandbookAudience(person, doc))),
    )
    .map((person) => person.id);
}

/** How many people launching would notify. */
export async function countHandbookLaunchAudience(): Promise<{ count: number }> {
  await requireAdminUser();
  const me = await getCurrentProfile();
  if (!me) return { count: 0 };
  return { count: (await launchRecipients(me.id)).length };
}

/** Opens the handbook to everyone and tells them once. */
export async function launchHandbook(): Promise<ActionResult & { notified?: number }> {
  await requireAdminUser();
  const me = await getCurrentProfile();
  if (!me?.organization_id) return { success: false, error: "No organization found." };

  // organization_settings is owner-only under RLS; admins may launch too.
  const admin = createAdminClient();
  const { data: claimed, error } = await admin
    .from("organization_settings")
    .update({ handbook_launched_at: new Date().toISOString() })
    .eq("id", true)
    .is("handbook_launched_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { success: false, error: "Couldn't launch the handbook." };
  if (!claimed) return { success: false, error: "The handbook is already launched." };

  const recipientIds = await launchRecipients(me.id);
  await Promise.all([
    notifyGrouped(admin, {
      orgId: me.organization_id,
      recipientIds,
      type: "handbook_published",
      entityType: "handbook",
      entityId: "launch",
      title: () => "The handbook is here",
      body: () => "Policies, guides and your role, in one place.",
    }),
    logActivity({
      orgId: me.organization_id,
      eventType: "handbook_published",
      actorId: me.id,
      actorName: me.full_name,
      entityType: "handbook",
      entityId: undefined,
      entityName: "Handbook",
      metadata: { launch: true, notified: recipientIds.length },
    }),
  ]);

  revalidateHandbook();
  revalidatePath("/", "layout");
  return { success: true, notified: recipientIds.length };
}

/** Back to owners and admins only. Nobody is notified. */
export async function hideHandbook(): Promise<ActionResult> {
  await requireAdminUser();
  const { error } = await createAdminClient()
    .from("organization_settings")
    .update({ handbook_launched_at: null })
    .eq("id", true);
  if (error) return { success: false, error: "Couldn't hide the handbook." };
  revalidateHandbook();
  revalidatePath("/", "layout");
  return { success: true };
}

/** Nudge everyone who hasn't confirmed the current version. Once per doc per day. */
export async function remindHandbookReaders(
  docId: string,
): Promise<ActionResult & { reminded?: number }> {
  await requireAdminUser();
  const me = await getCurrentProfile();
  if (!me?.organization_id) return { success: false, error: "No organization found." };

  const supabase = await createClient();
  const [{ data: doc }, settings, people, acks] = await Promise.all([
    supabase
      .from("handbook_docs")
      .select("id, slug, kind, title, version, requires_ack, jd_designation, archived_at, handbook_doc_audiences (kind, value)")
      .eq("id", docId)
      .maybeSingle(),
    getOrganizationSettings(),
    getHandbookPeoplePool(),
    getHandbookAcks(docId),
  ]);

  if (!doc || doc.archived_at || doc.version === 0 || !doc.requires_ack) {
    return { success: false, error: "Only published documents that ask for confirmation." };
  }

  const progress = computeReadProgress(
    {
      id: doc.id,
      kind: doc.kind as HandbookKind,
      jdDesignation: doc.jd_designation,
      version: doc.version,
      audiences: (doc.handbook_doc_audiences ?? []) as HandbookAudience[],
    },
    people,
    acks,
  );
  const recipientIds = progress.rows
    .filter((row) => row.status !== "current")
    .map((row) => row.person.id);

  if (recipientIds.length === 0) {
    return { success: false, error: "Everyone has read it." };
  }

  const { startIso } = orgDayUtcBounds(
    todayInTimezone(settings.timezone),
    settings.timezone,
  );
  const { data: claimed } = await supabase
    .from("handbook_docs")
    .update({ reminded_at: new Date().toISOString() })
    .eq("id", doc.id)
    .or(`reminded_at.is.null,reminded_at.lt.${startIso}`)
    .select("id")
    .maybeSingle();

  if (!claimed) {
    return { success: false, error: "A reminder already went out today." };
  }

  await notifyGrouped(createAdminClient(), {
    orgId: me.organization_id,
    recipientIds,
    type: "handbook_reminder",
    entityType: "handbook_doc",
    entityId: doc.slug,
    title: () => `Please read ${doc.title}`,
    body: () => `Confirm you've read version ${doc.version}.`,
  });

  revalidateHandbook(doc.id);
  return { success: true, reminded: recipientIds.length };
}

export async function archiveHandbookDoc(docId: string): Promise<ActionResult> {
  await requireAdminUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handbook_docs")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", docId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Couldn't archive the document." };
  }
  revalidateHandbook(docId);
  return { success: true };
}

/** How many people the rules reach (owners and admins are not added on top). */
export async function updateAskMeAbout(
  profileId: string,
  value: string,
): Promise<ActionResult> {
  await requireAdminUser();
  const text = value.trim();
  if (text.length > 80) {
    return { success: false, error: "Keep it under 80 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ask_me_about: text || null })
    .eq("id", profileId);

  if (error) {
    return { success: false, error: "Couldn't save that." };
  }
  revalidatePath(`/employees/${profileId}`);
  revalidatePath("/handbook");
  return { success: true };
}
