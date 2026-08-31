"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerUser } from "@/lib/supabase/require-admin";

export interface UpdateReportDeadlineResult {
  success: boolean;
  error?: string;
}

export async function updateReportDeadline(
  hourUtc: number,
): Promise<UpdateReportDeadlineResult> {
  const admin = await requireOwnerUser();

  if (!Number.isInteger(hourUtc) || hourUtc < 0 || hourUtc > 23) {
    return { success: false, error: "Enter an hour between 0 and 23." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_settings")
    .update({
      report_deadline_hour_utc: hourUtc,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Failed to update the report deadline." };
  }

  // Every page that computes submission status reads this setting.
  revalidatePath("/", "layout");

  return { success: true };
}
