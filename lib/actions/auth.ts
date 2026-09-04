"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthErrorMessage } from "@/lib/helpers/auth-error-messages";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("profiles")
      .update({ has_onboarded: true })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function markOnboarded() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from("profiles")
    .update({ has_onboarded: true })
    .eq("id", user.id);
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
