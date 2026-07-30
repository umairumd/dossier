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
        // Two FKs exist between departments and profiles
        // (departments.manager_id -> profiles.id, and
        // profiles.department_id -> departments.id) — the !constraint hint
        // picks the manager_id one; without it PostgREST throws PGRST201.
        "id, name, manager_id, archived_at, created_at, manager:profiles!departments_manager_id_fkey(full_name)",
      )
      .order("name", { ascending: true });

    if (departmentsError) {
      logAndThrow("Failed to load departments.", departmentsError);
    }

    // Only non-archived employees count toward headcount — an archived
    // employee no longer belongs to the active roster.
    const { data: employeeCounts, error: countsError } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("role", "employee")
      .is("archived_at", null);

    if (countsError) {
      logAndThrow("Failed to load department employee counts.", countsError);
    }

    const countByDepartment = new Map<string, number>();
    for (const row of employeeCounts ?? []) {
      if (row.department_id) {
        countByDepartment.set(
          row.department_id,
          (countByDepartment.get(row.department_id) ?? 0) + 1,
        );
      }
    }

    interface DepartmentRow {
      id: string;
      name: string;
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

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("department_id", departmentId)
    .is("archived_at", null);

  if (error) {
    logAndThrow("Failed to check department membership.", error);
  }

  return count ?? 0;
};
