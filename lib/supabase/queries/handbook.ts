import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import type {
  HandbookAudience,
  HandbookDoc,
  HandbookKind,
  HandbookReadState,
} from "@/types/handbook";

export interface HandbookDocRow {
  id: string;
  organization_id: string;
  kind: HandbookKind;
  title: string;
  slug: string;
  summary: string | null;
  body_md: string;
  draft_md: string;
  version: number;
  change_note: string | null;
  requires_ack: boolean;
  start_here: boolean;
  owner_id: string | null;
  jd_designation: string | null;
  published_at: string | null;
  published_by: string | null;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  handbook_doc_audiences?: HandbookAudience[] | null;
  publisher?: { full_name: string } | { full_name: string }[] | null;
}

export const HANDBOOK_DOC_SELECT =
  "*, handbook_doc_audiences (kind, value), publisher:profiles!handbook_docs_published_by_fkey (full_name)";

export function mapHandbookDoc(row: HandbookDocRow): HandbookDoc {
  const publisher = Array.isArray(row.publisher) ? row.publisher[0] : row.publisher;
  return {
    id: row.id,
    organizationId: row.organization_id,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    bodyMd: row.body_md,
    draftMd: row.draft_md,
    version: row.version,
    changeNote: row.change_note,
    requiresAck: row.requires_ack,
    startHere: row.start_here,
    ownerId: row.owner_id,
    jdDesignation: row.jd_designation,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    publishedByName: publisher?.full_name ?? null,
    remindedAt: row.reminded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    audiences: (row.handbook_doc_audiences ?? []).map((rule) => ({
      kind: rule.kind,
      value: rule.value,
    })),
  };
}

/** Published docs the signed-in person can read (RLS decides). */
export const getReadableHandbookDocs = cache(async (): Promise<HandbookDoc[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handbook_docs")
    .select(HANDBOOK_DOC_SELECT)
    .gt("version", 0)
    .is("archived_at", null)
    .order("title", { ascending: true });

  if (error) {
    throw new Error("Failed to load the handbook.");
  }
  return ((data ?? []) as HandbookDocRow[]).map(mapHandbookDoc);
});

/** A published doc by slug, or null when it doesn't exist or isn't readable. */
export const getHandbookDocBySlug = cache(
  async (slug: string): Promise<HandbookDoc | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("handbook_docs")
      .select(HANDBOOK_DOC_SELECT)
      .eq("slug", slug)
      .gt("version", 0)
      .is("archived_at", null)
      .maybeSingle();
    return data ? mapHandbookDoc(data as HandbookDocRow) : null;
  },
);

/** Slug for a doc id (notification links carry the id). */
export const getHandbookSlugById = cache(
  async (id: string): Promise<string | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("handbook_docs")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    return data?.slug ?? null;
  },
);

/** The signed-in person's latest read per doc. */
export const getMyHandbookReads = cache(
  async (): Promise<Record<string, HandbookReadState>> => {
    const user = await getAuthUser();
    if (!user) return {};
    const supabase = await createClient();
    const { data } = await supabase
      .from("handbook_acks")
      .select("doc_id, version, acknowledged_at")
      .eq("profile_id", user.id);

    const reads: Record<string, HandbookReadState> = {};
    for (const row of data ?? []) {
      const previous = reads[row.doc_id];
      if (!previous || row.version > previous.version) {
        reads[row.doc_id] = {
          version: row.version,
          acknowledgedAt: row.acknowledged_at,
        };
      }
    }
    return reads;
  },
);

/** Department names by id. Departments are readable by everyone signed in. */
export const getDepartmentNameMap = cache(
  async (): Promise<Map<string, string>> => {
    const supabase = await createClient();
    const { data } = await supabase.from("departments").select("id, name");
    return new Map((data ?? []).map((row) => [row.id as string, row.name as string]));
  },
);
