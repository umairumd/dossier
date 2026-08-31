import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import type { DepartmentListItem, ManagerCandidate } from "@/types/department";

// Logs the full Supabase error (message/code/details/hint are silent
// failure modes if dropped — "duplicate key", "permission denied", and
// "column does not exist" all surface as the same generic message
// otherwise) and throws a friendly error for the UI, with the original
// error attached via `cause` so the stack trace and full error object are
// still inspectable from wherever this is caught/logged upstream.
function logAndThrow(userMessage: string, error: PostgrestError): never {
  console.error(userMessage, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
  throw new Error(userMessage, { cause: error });
}

export const getAllDepartments = cache(
  async (): Promise<DepartmentListItem[]> => {
    await requireAdminUser();

    const supabase = await createClient();

    const { data: departments, error: departmentsError } = await supabase
      .from("departments")
      .select(
        "id, name, organization_id, manager_id, archived_at, created_at, manager:profiles!departments_manager_id_fkey(full_name)",
      )
      .order("name", { ascending: true });

    if (departmentsError) {
      logAndThrow("Failed to load departments.", departmentsError);
    }

    const { data: memberships, error: countsError } = await supabase
      .from("profile_departments")
      .select("department_id, profiles(archived_at, has_onboarded)");

    if (countsError) {
      logAndThrow("Failed to load department employee counts.", countsError);
    }

    const countByDepartment = new Map<string, number>();
    for (const row of memberships ?? []) {
      const embedded = row.profiles as unknown as
        | { archived_at: string | null; has_onboarded: boolean }
        | { archived_at: string | null; has_onboarded: boolean }[]
        | null;
      const profile = Array.isArray(embedded) ? embedded[0] : embedded;
      if (profile?.archived_at || !profile?.has_onboarded) {
        continue;
      }
      countByDepartment.set(
        row.department_id,
        (countByDepartment.get(row.department_id) ?? 0) + 1,
      );
    }

    interface DepartmentRow {
      id: string;
      name: string;
      organization_id: string | null;
      manager_id: string | null;
      archived_at: string | null;
      created_at: string;
      manager: { full_name: string } | null;
    }

    return (
      (departments as unknown as DepartmentRow[]) ?? []
    ).map((department) => ({
      id: department.id,
      name: department.name,
      organization_id: department.organization_id,
      manager_id: department.manager_id,
      manager_name: department.manager?.full_name ?? null,
      employee_count: countByDepartment.get(department.id) ?? 0,
      archived_at: department.archived_at,
      created_at: department.created_at,
    }));
  },
);

// Only profiles already role = 'manager' and not archived —
// departments_manager_role_check rejects assigning anyone else, and an
// archived manager shouldn't be assignable to a department going forward.
export const getManagerCandidates = cache(
  async (): Promise<ManagerCandidate[]> => {
    await requireAdminUser();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "manager")
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (error) {
      logAndThrow("Failed to load manager candidates.", error);
    }

    return data ?? [];
  },
);

// Used by archiveDepartment to enforce "no active employees still
// assigned" before allowing the archive.
export const countActiveDepartmentMembers = async (
  departmentId: string,
): Promise<number> => {
  await requireAdminUser();

  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("profile_departments")
    .select("profile_id, profiles(archived_at)")
    .eq("department_id", departmentId);

  if (error) {
    logAndThrow("Failed to check department membership.", error);
  }

  return (rows ?? []).filter((row) => {
    const embedded = row.profiles as unknown as
      | { archived_at: string | null }
      | { archived_at: string | null }[]
      | null;
    const profile = Array.isArray(embedded) ? embedded[0] : embedded;
    return !profile?.archived_at;
  }).length;
};
