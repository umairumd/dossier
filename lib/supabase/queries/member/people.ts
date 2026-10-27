import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import type { UserRole } from "@/types/profile";

export type DirectoryPerson = {
  id: string;
  full_name: string;
  designation: string | null;
  role: UserRole;
  avatar: unknown | null;
};

export type MyPeopleDirectory = {
  leadership: DirectoryPerson[];
  managers: DirectoryPerson[];
  supervisors: DirectoryPerson[];
};

function toPerson(row: {
  id: string;
  full_name: string;
  designation: string | null;
  role: string;
  avatar: unknown | null;
}): DirectoryPerson {
  return {
    id: row.id,
    full_name: row.full_name,
    designation: row.designation,
    role: row.role as UserRole,
    avatar: row.avatar,
  };
}

/**
 * People a plain member should see on Home: org owners/admins, their
 * department manager(s), and their supervisors. Relies on
 * profiles_select_directory_as_member + my_directory_profile_ids().
 */
export const getMyPeopleDirectory = cache(
  async (): Promise<MyPeopleDirectory> => {
    const empty: MyPeopleDirectory = {
      leadership: [],
      managers: [],
      supervisors: [],
    };

    const user = await getAuthUser();
    if (!user) return empty;

    const supabase = await createClient();

    const [
      { data: me },
      { data: memberships },
      { data: supervisorRows },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, organization_id, role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("profile_departments")
        .select("department_id")
        .eq("profile_id", user.id),
      supabase
        .from("member_supervisors")
        .select("supervisor_id")
        .eq("member_id", user.id),
    ]);

    if (!me || me.role !== "member" || !me.organization_id) {
      return empty;
    }

    const departmentIds = (memberships ?? []).map((row) => row.department_id);
    const supervisorIds = (supervisorRows ?? []).map((row) => row.supervisor_id);

    const [{ data: leadershipRows }, { data: managerRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, designation, role, avatar")
        .eq("organization_id", me.organization_id)
        .in("role", ["owner", "admin"])
        .eq("is_active", true)
        .is("archived_at", null)
        .order("full_name", { ascending: true }),
      departmentIds.length === 0
        ? Promise.resolve({ data: [] as { manager_id: string | null }[] })
        : supabase
            .from("departments")
            .select("manager_id")
            .in("id", departmentIds)
            .not("manager_id", "is", null),
    ]);

    const managerIdSet = new Set(
      (managerRows ?? [])
        .map((row) => row.manager_id)
        .filter((id): id is string => Boolean(id) && id !== user.id),
    );

    const supervisorIdSet = new Set(
      supervisorIds.filter((id) => id !== user.id),
    );

    const needProfileIds = [
      ...new Set([...managerIdSet, ...supervisorIdSet]),
    ];

    const { data: relatedProfiles } =
      needProfileIds.length === 0
        ? { data: [] as DirectoryPerson[] }
        : await supabase
            .from("profiles")
            .select("id, full_name, designation, role, avatar")
            .in("id", needProfileIds)
            .eq("is_active", true)
            .is("archived_at", null);

    const byId = new Map(
      (relatedProfiles ?? []).map((row) => [row.id, toPerson(row)]),
    );

    const leadership = (leadershipRows ?? [])
      .filter((row) => row.id !== user.id)
      .map(toPerson);

    const leadershipIds = new Set(leadership.map((person) => person.id));

    const managers = [...managerIdSet]
      .map((id) => byId.get(id))
      .filter((person): person is DirectoryPerson => Boolean(person))
      .filter((person) => !leadershipIds.has(person.id))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    const managerTaken = new Set(managers.map((person) => person.id));

    const supervisors = [...supervisorIdSet]
      .map((id) => byId.get(id))
      .filter((person): person is DirectoryPerson => Boolean(person))
      .filter(
        (person) =>
          !leadershipIds.has(person.id) && !managerTaken.has(person.id),
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    return { leadership, managers, supervisors };
  },
);
