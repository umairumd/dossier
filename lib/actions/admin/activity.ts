"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnerUser } from "@/lib/supabase/require-admin";

export async function deleteActivityEntry(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  // Authorization first: the service-role client below bypasses RLS.
  await requireOwnerUser();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("activity_log")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: "Entry not found." };
  }
  revalidatePath("/activity");
  revalidatePath("/");
  return { success: true };
}
