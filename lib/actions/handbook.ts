"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthUser } from "@/lib/supabase/server";

type AckResult = { success: boolean; error?: string; acknowledgedAt?: string };

async function recordRead(
  docId: string,
  kind: "confirm" | "open",
): Promise<AckResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  // RLS returns the doc only when this person can read it.
  const { data: doc } = await supabase
    .from("handbook_docs")
    .select("id, slug, version, requires_ack")
    .eq("id", docId)
    .gt("version", 0)
    .is("archived_at", null)
    .maybeSingle();

  if (!doc) return { success: false, error: "Document not found." };
  if (kind === "open" && doc.requires_ack) {
    return { success: false, error: "This document needs a confirmation." };
  }

  const acknowledgedAt = new Date().toISOString();
  const { error } = await supabase.from("handbook_acks").upsert(
    {
      doc_id: doc.id,
      profile_id: user.id,
      version: doc.version,
      acknowledged_at: acknowledgedAt,
    },
    { onConflict: "doc_id,profile_id,version", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[handbook] Failed to record read:", error);
    return { success: false, error: "Couldn't save that. Try again." };
  }

  revalidatePath("/handbook");
  revalidatePath(`/handbook/${doc.slug}`);
  return { success: true, acknowledgedAt };
}

/** "I've read and understood this" on a doc that asks for confirmation. */
export async function acknowledgeHandbookDoc(docId: string): Promise<AckResult> {
  return recordRead(docId, "confirm");
}

/** Opening a doc that doesn't ask for confirmation counts as reading it. */
export async function markHandbookDocOpened(docId: string): Promise<AckResult> {
  return recordRead(docId, "open");
}
