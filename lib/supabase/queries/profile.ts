import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

async function loadDepartmentAndSupervisorIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
): Promise<{
  department_ids: string[];
  supervisor_ids: string[];
  is_supervisor: boolean;
}> {
  const [{ data: memberships }, { data: supervisors }, { count: supervisedCount }] =
    await Promise.all([
      supabase
        .from("profile_departments")
        .select("department_id")
        .eq("profile_id", profileId),
      supabase
        .from("member_supervisors")
        .select("supervisor_id")
        .eq("member_id", profileId),
      supabase
        .from("member_supervisors")
        .select("member_id", { count: "exact", head: true })
        .eq("supervisor_id", profileId),
    ]);

  return {
    department_ids: (memberships ?? []).map((row) => row.department_id),
    supervisor_ids: (supervisors ?? []).map((row) => row.supervisor_id),
    is_supervisor: (supervisedCount ?? 0) > 0,
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, organization_id, is_active, has_onboarded, designation, is_remote, employment_type, avatar_url, template_id, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile) {
    return null;
  }

  const { department_ids, supervisor_ids, is_supervisor } =
    await loadDepartmentAndSupervisorIds(supabase, user.id);

  return {
    ...(profile as Omit<
      Profile,
      "department_ids" | "supervisor_ids" | "is_supervisor"
    >),
    department_ids,
    supervisor_ids,
    is_supervisor,
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
