"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
  fieldErrors?: { fullName?: string };
}

// Deliberately only touches full_name: role/department_id are blocked for
// self-updates by the profiles_role_department_immutability trigger
// regardless, and email changes go through the Admin API (admin-only —
// see lib/actions/admin/employees.ts), not this action.
export async function updateOwnProfile(
  fullName: string,
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

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Failed to update profile." };
  }

  revalidatePath("/settings/profile");
  revalidatePath("/");

  return { success: true };
}
