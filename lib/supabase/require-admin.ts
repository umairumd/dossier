import { createClient } from "@/lib/supabase/server";

// The /admin route's layout redirect is a UI convenience for non-admins,
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

  if (profile?.role !== "admin") {
    throw new Error("Not authorized.");
  }

  return user;
}
