import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityEventType } from "@/types/activity";

interface LogActivityParams {
  orgId: string;
  eventType: ActivityEventType;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

/** Resolve org_id + display name for an actor (used by server actions). */
export async function getActorLogContext(
  actorId: string,
): Promise<{ orgId: string | null; actorName: string | null }> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("profiles")
      .select("organization_id, full_name")
      .eq("id", actorId)
      .maybeSingle();

    return {
      orgId: data?.organization_id ?? null,
      actorName: data?.full_name ?? null,
    };
  } catch {
    return { orgId: null, actorName: null };
  }
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("activity_log").insert({
      org_id: params.orgId,
      event_type: params.eventType,
      actor_id: params.actorId ?? null,
      actor_name: params.actorName ?? null,
      target_id: params.targetId ?? null,
      target_name: params.targetName ?? null,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      entity_name: params.entityName ?? null,
      metadata: params.metadata ?? null,
    });
    if (error) {
      console.error("[activity-log] Failed to write log entry:", error);
    }
  } catch (error) {
    // Never fail the parent action due to logging failure
    console.error("[activity-log] Failed to write log entry:", error);
  }
}
