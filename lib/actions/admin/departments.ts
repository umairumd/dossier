"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser, requireOwnerUser } from "@/lib/supabase/require-admin";
import { countActiveDepartmentMembers } from "@/lib/supabase/queries/admin/departments";
import {
  validateDepartmentName,
  type DepartmentFieldErrors,
} from "@/lib/validations/department";

export interface DepartmentActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: DepartmentFieldErrors;
  memberCount?: number;
}

export async function createDepartment(
  name: string,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  const validation = validateDepartmentName(name);

  if (!validation.valid) {
    return { success: false, fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .insert({ name: validation.value.name });

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        fieldErrors: { name: "A department with this name already exists." },
      };
    }
    return { success: false, error: "Failed to create department." };
  }

  revalidatePath("/admin/departments");

  return { success: true };
}

export async function updateDepartmentName(
  id: string,
  name: string,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  const validation = validateDepartmentName(name);

  if (!validation.valid) {
    return { success: false, fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ name: validation.value.name })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        fieldErrors: { name: "A department with this name already exists." },
      };
    }
    return { success: false, error: "Failed to update department." };
  }

  revalidatePath("/admin/departments");

  return { success: true };
}

// managerId = null unassigns the department's manager. Assigning a
// non-null id that isn't role='manager' is rejected by the
// departments_manager_role_check trigger — surfaced here as a friendly
// message instead of a raw Postgres error.
export async function assignDepartmentManager(
  departmentId: string,
  managerId: string | null,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ manager_id: managerId })
    .eq("id", departmentId);

  if (error) {
    return {
      success: false,
      error:
        "Failed to assign manager. Make sure this person has the Manager role and isn't already managing another department.",
    };
  }

  revalidatePath("/admin/departments");
  revalidatePath("/admin/employees");

  return { success: true };
}

// archiveDepartment warns (returns memberCount) when active members are
// still assigned via profile_departments. archiveDepartmentForce skips
// that check after the admin confirms in the UI.
async function performArchive(
  departmentId: string,
): Promise<DepartmentActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", departmentId);

  if (error) {
    return { success: false, error: "Failed to archive department." };
  }

  revalidatePath("/admin/departments");

  return { success: true };
}

export async function archiveDepartment(
  departmentId: string,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  const memberCount = await countActiveDepartmentMembers(departmentId);

  if (memberCount > 0) {
    return {
      success: false,
      error: `This department has ${memberCount} active member(s). Remove them from the department before archiving, or they will become unassigned.`,
      memberCount,
    };
  }

  return performArchive(departmentId);
}

export async function archiveDepartmentForce(
  departmentId: string,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  return performArchive(departmentId);
}

export async function restoreDepartment(
  departmentId: string,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ archived_at: null })
    .eq("id", departmentId);

  if (error) {
    return { success: false, error: "Failed to restore department." };
  }

  revalidatePath("/admin/departments");

  return { success: true };
}

// Permanent delete: only allowed once already archived (checked
// server-side). Safe to run even if an archived employee's department_id
// still points here — profiles.department_id -> departments.id is
// ON DELETE SET NULL (see the migration accompanying this feature), so
// that reference is cleared automatically rather than blocking the delete.
export async function permanentlyDeleteDepartment(
  departmentId: string,
): Promise<DepartmentActionResult> {
  await requireOwnerUser();

  const supabase = await createClient();
  const { data: department, error: fetchError } = await supabase
    .from("departments")
    .select("archived_at")
    .eq("id", departmentId)
    .maybeSingle();

  if (fetchError || !department) {
    return { success: false, error: "Department not found." };
  }

  if (!department.archived_at) {
    return {
      success: false,
      error: "Only archived departments can be permanently deleted.",
    };
  }

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", departmentId);

  if (error) {
    return { success: false, error: "Failed to permanently delete department." };
  }

  revalidatePath("/admin/departments");
  revalidatePath("/admin/employees");

  return { success: true };
}
