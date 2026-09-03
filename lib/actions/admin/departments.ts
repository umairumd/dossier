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

function revalidateDepartmentPaths(departmentId?: string) {
  revalidatePath("/admin/departments");
  revalidatePath("/departments");
  if (departmentId) {
    revalidatePath(`/departments/${departmentId}`);
  }
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

  revalidateDepartmentPaths();

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

  revalidateDepartmentPaths(id);

  return { success: true };
}

// managerId = null unassigns the department's manager. Assigning a
// non-null id that isn't role='manager' is rejected by the
// departments_manager_role_check trigger — surfaced here as a friendly
// message instead of a raw Postgres error.
// If the assignee is not already a member, they are added to
// profile_departments so they can manage a team they belong to.
export async function assignDepartmentManager(
  departmentId: string,
  managerId: string | null,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  const supabase = await createClient();

  if (managerId) {
    const { data: membership, error: membershipError } = await supabase
      .from("profile_departments")
      .select("profile_id")
      .eq("department_id", departmentId)
      .eq("profile_id", managerId)
      .maybeSingle();

    if (membershipError) {
      return { success: false, error: "Failed to assign manager." };
    }

    if (!membership) {
      const { error: insertError } = await supabase
        .from("profile_departments")
        .insert({ profile_id: managerId, department_id: departmentId });

      if (insertError) {
        return { success: false, error: "Failed to add manager to this department." };
      }
    }
  }

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

  revalidateDepartmentPaths(departmentId);
  revalidatePath("/employees");

  return { success: true };
}

export async function addEmployeeToDepartment(
  employeeId: string,
  departmentId: string,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("profile_departments")
    .select("profile_id")
    .eq("department_id", departmentId)
    .eq("profile_id", employeeId)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: "Failed to add member." };
  }

  if (existing) {
    return { success: false, error: "Already in this department" };
  }

  const { error } = await supabase.from("profile_departments").insert({
    profile_id: employeeId,
    department_id: departmentId,
  });

  if (error) {
    return { success: false, error: "Failed to add member." };
  }

  revalidateDepartmentPaths(departmentId);
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);

  return { success: true };
}

export async function removeEmployeeFromDepartment(
  employeeId: string,
  departmentId: string,
): Promise<DepartmentActionResult> {
  await requireAdminUser();

  const supabase = await createClient();

  const { data: department, error: departmentError } = await supabase
    .from("departments")
    .select("manager_id")
    .eq("id", departmentId)
    .maybeSingle();

  if (departmentError || !department) {
    return { success: false, error: "Department not found." };
  }

  if (department.manager_id === employeeId) {
    const { error: clearError } = await supabase
      .from("departments")
      .update({ manager_id: null })
      .eq("id", departmentId);

    if (clearError) {
      return { success: false, error: "Failed to remove member." };
    }
  }

  const { error } = await supabase
    .from("profile_departments")
    .delete()
    .eq("department_id", departmentId)
    .eq("profile_id", employeeId);

  if (error) {
    return { success: false, error: "Failed to remove member." };
  }

  revalidateDepartmentPaths(departmentId);
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);

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

  revalidateDepartmentPaths(departmentId);

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

  revalidateDepartmentPaths(departmentId);

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

  revalidateDepartmentPaths();
  revalidatePath("/employees");

  return { success: true };
}
