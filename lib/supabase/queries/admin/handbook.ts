import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  HANDBOOK_DOC_SELECT,
  mapHandbookDoc,
  type HandbookDocRow,
} from "@/lib/supabase/queries/handbook";
import type { AudiencePerson } from "@/lib/handbook/audience";
import type { HandbookDoc } from "@/types/handbook";
import type { UserRole } from "@/types/profile";

export interface HandbookPoolPerson extends AudiencePerson {
  full_name: string;
  avatar: unknown | null;
  role: UserRole;
}

export interface HandbookAckRow {
  doc_id: string;
  profile_id: string;
  version: number;
  acknowledged_at: string;
}

/**
 * Active people in the admin's organization with what audience rules match
 * on (departments, supervisor flag). Shared by the list, the editor and the
 * count, publish and remind actions.
 */
export const getHandbookPeoplePool = cache(
  async (): Promise<HandbookPoolPerson[]> => {
    await requireAdminUser();
    const me = await getCurrentProfile();
    if (!me?.organization_id) return [];

    const supabase = await createClient();
    const [{ data: profiles, error }, { data: memberships }, { data: supervisors }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role, designation, employment_type, is_remote, avatar")
          .eq("organization_id", me.organization_id)
          .eq("is_active", true)
          .is("archived_at", null)
          .order("full_name", { ascending: true }),
        supabase.from("profile_departments").select("profile_id, department_id"),
        supabase.from("member_supervisors").select("supervisor_id"),
      ]);

    if (error) {
      throw new Error("Failed to load people.");
    }

    const departmentsByProfile = new Map<string, string[]>();
    for (const row of memberships ?? []) {
      const list = departmentsByProfile.get(row.profile_id) ?? [];
      list.push(row.department_id);
      departmentsByProfile.set(row.profile_id, list);
    }
    const supervisorIds = new Set((supervisors ?? []).map((row) => row.supervisor_id));

    return (profiles ?? []).map((row) => ({
      id: row.id,
      full_name: row.full_name,
      role: row.role as UserRole,
      designation: row.designation,
      employment_type: (row.employment_type ?? "full_time") as "full_time" | "part_time",
      is_remote: Boolean(row.is_remote),
      avatar: row.avatar,
      department_ids: departmentsByProfile.get(row.id) ?? [],
      is_supervisor: supervisorIds.has(row.id),
    }));
  },
);

/** Every doc in the organization, drafts and archived included. */
export const getOrgHandbookDocs = cache(async (): Promise<HandbookDoc[]> => {
  await requireAdminUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handbook_docs")
    .select(HANDBOOK_DOC_SELECT)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load the handbook.");
  }
  return ((data ?? []) as HandbookDocRow[]).map(mapHandbookDoc);
});

export const getHandbookDocForEdit = cache(
  async (id: string): Promise<HandbookDoc | null> => {
    await requireAdminUser();
    const supabase = await createClient();
    const { data } = await supabase
      .from("handbook_docs")
      .select(HANDBOOK_DOC_SELECT)
      .eq("id", id)
      .maybeSingle();
    return data ? mapHandbookDoc(data as HandbookDocRow) : null;
  },
);

/** Departments for audience pickers, active first. */
export const getHandbookDepartments = cache(
  async (): Promise<{ id: string; name: string; archived: boolean }[]> => {
    await requireAdminUser();
    const supabase = await createClient();
    const { data } = await supabase
      .from("departments")
      .select("id, name, archived_at")
      .order("name", { ascending: true });
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      archived: Boolean(row.archived_at),
    }));
  },
);

/** Read confirmations, for every doc or one. */
export const getHandbookAcks = cache(
  async (docId?: string): Promise<HandbookAckRow[]> => {
    await requireAdminUser();
    const supabase = await createClient();
    let query = supabase
      .from("handbook_acks")
      .select("doc_id, profile_id, version, acknowledged_at");
    if (docId) query = query.eq("doc_id", docId);
    const { data } = await query;
    return (data ?? []) as HandbookAckRow[];
  },
);
