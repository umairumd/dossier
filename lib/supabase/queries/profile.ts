import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

// Wrapped in React's cache() because both (app)/layout.tsx (for the shell's
// nav/user menu) and each page below it call this per request — without
// caching, that's a duplicate profiles query on every navigation.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // maybeSingle(), not single(): a signed-in user with no profile row yet
  // (see /no-profile) is an expected state, not an error condition.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, department_id, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (profile as Profile) ?? null;
});

export interface ProfileWithDepartment extends Profile {
  department: { name: string } | null;
}

// Same single profile lookup as getCurrentProfile, just with the
// department name embedded via the FK relation — not a second fetch, and
// not "report data," so it stays within this milestone's data-fetching
// scope (the employee dashboard needs to show a department name, not
// just the department_id UUID).
export const getCurrentProfileWithDepartment = cache(
  async (): Promise<ProfileWithDepartment | null> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, full_name, role, department_id, created_at, department:departments(name)",
      )
      .eq("id", user.id)
      .maybeSingle();

    // Supabase infers embedded to-one relations as arrays from the select
    // string alone (it can't know department_id's FK is one-to-one without
    // generated Database types) — the department_id FK guarantees at most
    // one row, so this cast reflects the true cardinality, not a bypass.
    return (profile as unknown as ProfileWithDepartment) ?? null;
  },
);
