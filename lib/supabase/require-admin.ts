import { createClient } from "@/lib/supabase/server";

function isOwnerOrAdmin(role: string | undefined): boolean {
  return role === "owner" || role === "admin";
}

// The /admin route's layout redirect is a UI convenience,
// not a security boundary. Anything that constructs the service-role
// admin client (lib/supabase/admin.ts) bypasses RLS entirely, so it must
// call this first — every admin-only query and Server Action does.
export async function requireAdminUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isOwnerOrAdmin(profile?.role)) {
    throw new Error("Not authorized.");
  }

  return user;
}

export async function requireOwnerUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "owner") {
    throw new Error("Not authorized.");
  }

  return user;
}

export async function requireSupervisorUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
