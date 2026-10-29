import { createAdminClient } from "@/lib/supabase/admin";
import type { AudiencePerson } from "@/lib/handbook/audience";
import type { Profile } from "@/types/profile";

// Server-only helpers for notices: the people an audience can reach, and
// what the signed-in person is allowed to post. Not a "use server" file.

export type PoolPerson = AudiencePerson & {
  full_name: string;
  avatar: unknown | null;
};

export async function loadAudiencePool(orgId: string): Promise<PoolPerson[]> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: memberships }, { data: supervisors }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, designation, employment_type, is_remote, avatar")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("full_name", { ascending: true }),
    admin.from("profile_departments").select("profile_id, department_id"),
    admin.from("member_supervisors").select("supervisor_id"),
  ]);
  const departmentsBy = new Map<string, string[]>();
  for (const row of memberships ?? []) {
    const list = departmentsBy.get(row.profile_id) ?? [];
    list.push(row.department_id);
    departmentsBy.set(row.profile_id, list);
  }
  const supervisorIds = new Set((supervisors ?? []).map((row) => row.supervisor_id as string));
  return (profiles ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    role: row.role,
    designation: row.designation,
    employment_type: (row.employment_type ?? "full_time") as "full_time" | "part_time",
    is_remote: Boolean(row.is_remote),
    avatar: row.avatar,
    department_ids: departmentsBy.get(row.id) ?? [],
    is_supervisor: supervisorIds.has(row.id),
  }));
}

export type PostingRights = {
  /** Owners and admins: any audience, anyone. */
  all: boolean;
  /** Departments this person manages (announcements to these only). */
  departmentIds: string[];
  /** People this person can send a personal notice to. */
  personIds: string[];
};

export async function getPostingRights(me: Profile): Promise<PostingRights> {
  if (!me.organization_id) return { all: false, departmentIds: [], personIds: [] };
  if (me.role === "owner" || me.role === "admin") {
    return { all: true, departmentIds: [], personIds: [] };
  }
  const admin = createAdminClient();
  const [{ data: managed }, { data: supervised }] = await Promise.all([
    admin
      .from("departments")
      .select("id")
      .eq("manager_id", me.id),
    admin.from("member_supervisors").select("member_id").eq("supervisor_id", me.id),
  ]);
  const departmentIds = (managed ?? []).map((row) => row.id as string);
  const { data: members } = departmentIds.length
    ? await admin.from("profile_departments").select("profile_id").in("department_id", departmentIds)
    : { data: [] as { profile_id: string }[] };
  const personIds = [
    ...new Set([
      ...(members ?? []).map((row) => row.profile_id as string),
      ...(supervised ?? []).map((row) => row.member_id as string),
    ]),
  ].filter((id) => id !== me.id);
  return { all: false, departmentIds, personIds };
}

export function canPostAnything(rights: PostingRights): boolean {
  return rights.all || rights.departmentIds.length > 0 || rights.personIds.length > 0;
}
