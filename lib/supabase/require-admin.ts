import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import type { Profile } from "@/types/profile";

function isOwnerOrAdmin(role: string | undefined): boolean {
  return role === "owner" || role === "admin";
}

// The /admin route's layout redirect is a UI convenience,
// not a security boundary. Anything that constructs the service-role
// admin client (lib/supabase/admin.ts) bypasses RLS entirely, so it must
// call this first — every admin-only query and Server Action does.
export async function requireAdminUser() {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  // The cached profile of the signed-in user: no extra query during a render.
  const profile = await getCurrentProfile();

  if (!isOwnerOrAdmin(profile?.role)) {
    throw new Error("Not authorized.");
  }

  return user;
}

export async function requireOwnerUser() {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  // The cached profile of the signed-in user: no extra query during a render.
  const profile = await getCurrentProfile();

  if (profile?.role !== "owner") {
    throw new Error("Not authorized.");
  }

  return user;
}

export async function requireSupervisorUser() {
  const supabase = await createClient();

  const user = await getAuthUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { count, error } = await supabase
    .from("member_supervisors")
    .select("member_id", { count: "exact", head: true })
    .eq("supervisor_id", user.id);

  if (error) {
    throw new Error("Not authorized.");
  }

  if ((count ?? 0) === 0) {
    throw new Error("Not authorized.");
  }

  return user;
}

export async function requireManagerUser(): Promise<{
  userId: string;
  profile: Profile;
}> {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  if (!["owner", "admin", "manager"].includes(profile.role)) {
    redirect("/");
  }

  return { userId: user.id, profile };
}
