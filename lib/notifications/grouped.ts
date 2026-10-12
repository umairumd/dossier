import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/notification";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Active owners and admins of an organisation, minus the given people. */
export async function getOrgAdminIds(
  adminClient: AdminClient,
  orgId: string,
  exclude: (string | null | undefined)[],
): Promise<string[]> {
  const { data, error } = await adminClient
    .from("profiles")
    .select("id")
    .eq("organization_id", orgId)
    .in("role", ["owner", "admin"])
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) {
    console.error("[notifications] Failed to load admins:", error);
    return [];
  }
  const skip = new Set(exclude.filter(Boolean));
  return (data ?? []).map((row) => row.id).filter((id) => !skip.has(id));
}

/**
 * One notification per recipient per entity while it is unread: a repeat
 * event updates that row (count, title, body, time) instead of adding a
 * new one. Server-side only; callers authorise first.
 */
export async function notifyGrouped(
  adminClient: AdminClient,
  params: {
    orgId: string;
    recipientIds: string[];
    type: NotificationType;
    entityType: string;
    entityId: string;
    title: (count: number) => string;
    body: (count: number) => string | null;
  },
): Promise<void> {
  if (params.recipientIds.length === 0) return;

  const { data: open, error } = await adminClient
    .from("notifications")
    .select("id, profile_id, occurrences")
    .in("profile_id", params.recipientIds)
    .eq("type", params.type)
    .eq("entity_id", params.entityId)
    .is("read_at", null)
    .is("cleared_at", null);

  if (error) {
    console.error("[notifications] Failed to load open groups:", error);
    return;
  }

  const now = new Date().toISOString();
  const openByRecipient = new Map(
    (open ?? []).map((row) => [row.profile_id as string, row]),
  );

  const updates = [...openByRecipient.values()].map((row) => {
    const count = (row.occurrences ?? 1) + 1;
    return adminClient
      .from("notifications")
      .update({
        occurrences: count,
        title: params.title(count),
        body: params.body(count),
        created_at: now,
      })
      .eq("id", row.id);
  });

  const fresh = params.recipientIds
    .filter((id) => !openByRecipient.has(id))
    .map((profileId) => ({
      org_id: params.orgId,
      profile_id: profileId,
      type: params.type,
      title: params.title(1),
      body: params.body(1),
      entity_type: params.entityType,
      entity_id: params.entityId,
    }));

  const results = await Promise.all([
    ...updates,
    fresh.length > 0
      ? adminClient.from("notifications").insert(fresh)
      : Promise.resolve({ error: null }),
  ]);
  for (const result of results) {
    if (result.error) {
      console.error("[notifications] Failed to write group:", result.error);
    }
  }
}
