"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { friendlyAuthErrorMessage } from "@/lib/helpers/auth-error-messages";
import { insertLeaveBalanceRecord } from "@/lib/helpers/leave-balance";
import { getSiteUrl } from "@/lib/helpers/site-url";

export async function login(
  formData: FormData,
): Promise<{ error: string } | void> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Something went wrong. Please try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: friendlyAuthErrorMessage(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function markOnboarded(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ has_onboarded: true })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Failed to complete onboarding." };
  }

  // Leave balance init is secondary — never fail onboarding.
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.organization_id) {
      const adminClient = createAdminClient();
      const result = await insertLeaveBalanceRecord(
        adminClient,
        user.id,
        profile.organization_id,
        profile.created_at.slice(0, 10),
      );
      if (!result.success) {
        console.error("Failed to initialize leave balance:", result.error);
      }

      const { data: admins } = await adminClient
        .from("profiles")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .in("role", ["owner", "admin"]);

      await Promise.all(
        (admins ?? []).map((admin) =>
          createNotification({
            orgId: profile.organization_id,
            profileId: admin.id,
            type: "employee_onboarded",
            title: "A new employee has completed onboarding",
            entityType: "employee",
            entityId: user.id,
          }),
        ),
      );
    }
  } catch (leaveError) {
    console.error("Failed to initialize leave balance:", leaveError);
  }

  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: boolean,
  formData: FormData,
): Promise<boolean> {
  const email = formData.get("email");

  if (typeof email === "string" && email.length > 0) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
  }

  return true;
}
