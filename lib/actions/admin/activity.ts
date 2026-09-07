"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerUser } from "@/lib/supabase/require-admin";

export async function deleteActivityEntry(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireOwnerUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("activity_log")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/activity");
  revalidatePath("/");
  return { success: true };
}
