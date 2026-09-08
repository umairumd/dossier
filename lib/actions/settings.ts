"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
  fieldErrors?: { fullName?: string };
}

// Touches full_name and optional date_of_birth. role/department_id are
// blocked for self-updates by the profiles_role_department_immutability
// trigger regardless, and email changes go through the Admin API
// (admin-only — see lib/actions/admin/employees.ts), not this action.
export async function updateOwnProfile(
  fullName: string,
  dateOfBirth?: string | null,
): Promise<UpdateProfileResult> {
  const trimmed = fullName.trim();

  if (!trimmed) {
    return { success: false, fieldErrors: { fullName: "Name is required." } };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const update: { full_name: string; date_of_birth?: string | null } = {
    full_name: trimmed,
  };
  if (dateOfBirth !== undefined) {
    update.date_of_birth = dateOfBirth?.trim() || null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Failed to update profile." };
  }

  revalidatePath("/settings/profile");
  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true };
}
