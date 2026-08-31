import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

async function loadDepartmentAndSupervisorIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
): Promise<{ department_ids: string[]; supervisor_ids: string[] }> {
  const [{ data: memberships }, { data: supervisors }] = await Promise.all([
    supabase
      .from("profile_departments")
      .select("department_id")
      .eq("profile_id", profileId),
    supabase
      .from("member_supervisors")
      .select("supervisor_id")
      .eq("member_id", profileId),
  ]);

  return {
    department_ids: (memberships ?? []).map((row) => row.department_id),
    supervisor_ids: (supervisors ?? []).map((row) => row.supervisor_id),
  };
}

async function loadDepartmentNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  departmentIds: string[],
): Promise<string[]> {
  if (departmentIds.length === 0) {
    return [];
  }

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .in("id", departmentIds);

  const nameById = new Map(
    (departments ?? []).map((department) => [department.id, department.name]),
  );

  return departmentIds
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name));
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, organization_id, is_active, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const { department_ids, supervisor_ids } =
    await loadDepartmentAndSupervisorIds(supabase, user.id);

  return {
    ...(profile as Omit<Profile, "department_ids" | "supervisor_ids">),
    department_ids,
    supervisor_ids,
  };
});

export interface ProfileWithDepartment extends Profile {
  department_names: string[];
}

export const getCurrentProfileWithDepartment = cache(
  async (): Promise<ProfileWithDepartment | null> => {
    const profile = await getCurrentProfile();

    if (!profile) {
      return null;
    }

    const supabase = await createClient();
    const department_names = await loadDepartmentNames(
      supabase,
      profile.department_ids,
    );

    return { ...profile, department_names };
  },
);

export const getCurrentUserEmail = cache(async (): Promise<string | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email ?? null;
});
