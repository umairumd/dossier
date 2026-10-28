import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/notification";

// Server-only helper. It must not live in a "use server" file: everything
// exported from one can be called from the browser.
export async function createNotification(params: {
  orgId: string;
  profileId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("notifications").insert({
    org_id: params.orgId,
    profile_id: params.profileId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
  });

  if (error) {
    console.error("[notifications] Failed to create notification:", error);
    throw new Error(error.message);
  }
}
