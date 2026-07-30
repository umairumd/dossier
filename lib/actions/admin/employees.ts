"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getSiteUrl } from "@/lib/helpers/site-url";
import {
  validateEditEmployeeInput,
  validateInviteEmployeeInput,
  type EditEmployeeInput,
  type EmployeeFieldErrors,
  type InviteEmployeeInput,
} from "@/lib/validations/employee";

export interface InviteEmployeeResult {
  success: boolean;
  error?: string;
  fieldErrors?: EmployeeFieldErrors;
  inviteLink?: string;
}

export interface EmployeeActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: EmployeeFieldErrors;
}

// One year — effectively permanent until explicitly reactivated, and
// reversible (setEmployeeActive(id, true) / restoreEmployee both set
// ban_duration back to "none").
const DEACTIVATION_BAN_DURATION = "8760h";

function revalidateEmployeePaths(employeeId: string) {
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employeeId}`);
}

export async function inviteEmployee(
  input: InviteEmployeeInput,
): Promise<InviteEmployeeResult> {
  await requireAdminUser();

  const validation = validateInviteEmployeeInput(input);

  if (!validation.valid) {
    return { success: false, fieldErrors: validation.fieldErrors };
  }

  const { email, fullName, role, departmentId } = validation.value;
  const adminClient = createAdminClient();

  // generateLink (not inviteUserByEmail) is used deliberately: it always
  // returns the invite link in the response regardless of whether SMTP is
  // configured on the Supabase project, so the admin can copy/share it
  // manually as a fallback — inviteUserByEmail's success depends on email
  // delivery actually working. redirectTo points at our own acceptance
  // page — without it, Supabase falls back to the project's default Site
  // URL, which has no idea how to exchange the invite token.
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName },
      redirectTo: `${getSiteUrl()}/invite`,
    },
  });

  if (error) {
    if (error.code === "email_exists") {
      return {
        success: false,
        fieldErrors: { email: "An account with this email already exists." },
      };
    }
    return { success: false, error: "Failed to create the invitation." };
  }

  // The invite trigger (handle_new_user) already created a baseline
  // profile (role='employee', no department); this applies the role and
  // department the admin actually chose, via the regular RLS-respecting
  // client — the service-role client is only needed for the auth.users
  // side above.
  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName, role, department_id: departmentId })
    .eq("id", data.user.id);

  if (profileError) {
    return {
      success: false,
      error:
        "Invitation created, but couldn't set the employee's role/department. Edit them from the list to fix this.",
    };
  }

  revalidatePath("/admin/employees");

  return { success: true, inviteLink: data.properties.action_link };
}

export async function updateEmployee(
  input: EditEmployeeInput & { id: string },
): Promise<EmployeeActionResult> {
  await requireAdminUser();

  const validation = validateEditEmployeeInput(input);

  if (!validation.valid) {
    return { success: false, fieldErrors: validation.fieldErrors };
  }

  // Email lives on auth.users, not profiles — changing it is an Admin API
  // call. email_confirm: true applies it immediately rather than sending
  // the new address a confirmation link first: the admin is making this
  // change deliberately, not the employee self-serving it.
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(
    input.id,
    { email: validation.value.email, email_confirm: true },
  );

  if (authError) {
    if (authError.code === "email_exists") {
      return {
        success: false,
        fieldErrors: { email: "Another account already uses this email." },
      };
    }
    return { success: false, error: "Failed to update employee email." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: validation.value.fullName,
      role: validation.value.role,
      department_id: validation.value.departmentId,
    })
    .eq("id", input.id);

  if (error) {
    return { success: false, error: "Failed to update employee." };
  }

  revalidateEmployeePaths(input.id);

  return { success: true };
}

export async function setEmployeeActive(
  employeeId: string,
  isActive: boolean,
): Promise<EmployeeActionResult> {
  await requireAdminUser();

  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(
    employeeId,
    { ban_duration: isActive ? "none" : DEACTIVATION_BAN_DURATION },
  );

  if (authError) {
    return { success: false, error: "Failed to update account access." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", employeeId);

  if (profileError) {
    return { success: false, error: "Failed to update employee status." };
  }

  revalidateEmployeePaths(employeeId);

  return { success: true };
}

// Archive: soft-removes the employee from the active org. Uses the same
// ban mechanism as deactivate (so they can't log in — see
// lib/supabase/proxy.ts and every query's use of getUser(), which
// revalidates against Supabase Auth), plus archived_at so they're
// excluded from active rosters/headcounts and distinguishable from a
// plain deactivation in the UI. Historical daily_reports rows are never
// touched — nothing here deletes or reassigns them.
export async function archiveEmployee(
  employeeId: string,
): Promise<EmployeeActionResult> {
  await requireAdminUser();

  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(
    employeeId,
    { ban_duration: DEACTIVATION_BAN_DURATION },
  );

  if (authError) {
    return { success: false, error: "Failed to archive employee account." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq("id", employeeId);

  if (profileError) {
    return { success: false, error: "Failed to archive employee." };
  }

  revalidateEmployeePaths(employeeId);
  revalidatePath("/admin/departments");

  return { success: true };
}

export async function restoreEmployee(
  employeeId: string,
): Promise<EmployeeActionResult> {
  await requireAdminUser();

  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(
    employeeId,
    { ban_duration: "none" },
  );

  if (authError) {
    return { success: false, error: "Failed to restore employee account." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_active: true, archived_at: null })
    .eq("id", employeeId);

  if (profileError) {
    return { success: false, error: "Failed to restore employee." };
  }

  revalidateEmployeePaths(employeeId);
  revalidatePath("/admin/departments");

  return { success: true };
}

// Permanent delete: only allowed once already archived (checked
// server-side, not just gated in the UI). Deletes the auth.users row via
// the Admin API — profiles.id -> auth.users.id and
// daily_reports.author_id -> profiles.id both cascade (on delete
// cascade, set at creation), so this removes the profile and every
// report they ever submitted in one operation. This is the one
// operation in this app that erases history rather than preserving it —
// deliberately, since it's the only way to free up their email address
// for re-inviting (an archived-but-not-deleted auth user still owns
// their email, which is exactly the problem this action exists to solve).
export async function permanentlyDeleteEmployee(
  employeeId: string,
): Promise<EmployeeActionResult> {
  await requireAdminUser();

  const supabase = await createClient();
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("archived_at")
    .eq("id", employeeId)
    .maybeSingle();

  if (fetchError || !profile) {
    return { success: false, error: "Employee not found." };
  }

  if (!profile.archived_at) {
    return {
      success: false,
      error: "Only archived employees can be permanently deleted.",
    };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(employeeId);

  if (error) {
    return { success: false, error: "Failed to permanently delete employee." };
  }

  revalidatePath("/admin/employees");
  revalidatePath("/admin/departments");

  return { success: true };
}

// Re-inviting an email that already exists but hasn't confirmed yet (still
// "Invited" or "Pending") issues a fresh token for the same auth.users row
// rather than erroring — GoTrue only rejects generateLink(type: "invite")
// with email_exists for an already-CONFIRMED user. The existing profile
// (name/role/department) is untouched: handle_new_user only fires on
// INSERT, and this doesn't create a new auth.users row.
export async function resendInvitation(
  email: string,
): Promise<EmployeeActionResult> {
  await requireAdminUser();

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${getSiteUrl()}/invite` },
  });

  if (error) {
    return { success: false, error: "Failed to resend the invitation." };
  }

  revalidatePath("/admin/employees");

  return { success: true };
}
