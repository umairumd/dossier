"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Fire-and-forget activity heartbeat. No revalidatePath. */
export async function updateLastSeen(profileId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== profileId) return;

    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", profileId);
  } catch {
    // Never fail the parent render due to heartbeat write failure.
  }
}
