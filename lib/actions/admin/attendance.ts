"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";
import type { ShiftType } from "@/types/attendance";

export interface AttendanceActionResult {
  success: boolean;
  error?: string;
}

export async function assignShiftAction(
  profileId: string,
  orgId: string,
  shiftType: ShiftType,
  effectiveFrom: string,
): Promise<AttendanceActionResult> {
  await requireAdminUser();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Close any currently open shift
  await supabase
    .from("shift_assignments")
    .update({ effective_to: effectiveFrom })
    .eq("profile_id", profileId)
    .is("effective_to", null)
    .lte("effective_from", today);

  // Insert new shift
  const { error } = await supabase.from("shift_assignments").insert({
    profile_id: profileId,
    org_id: orgId,
    shift_type: shiftType,
    effective_from: effectiveFrom,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/employees/${profileId}`);
  return { success: true };
}
