"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, requireOwnerUser } from "@/lib/supabase/require-admin";
import {
  countActiveAdmins,
  countAllAdmins,
} from "@/lib/supabase/queries/admin/employees";
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

  const { email, fullName, role } = validation.value;
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
  // profile (role='member'); this applies the role and name the admin
  // chose. Department assignment is a separate action.
  const inviteLink = data.properties.action_link;
  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      pending_invite_link: inviteLink,
    })
    .eq("id", data.user.id);

  if (profileError) {
    return {
      success: false,
      error:
        "Invitation created, but couldn't set the employee's role. Edit them from the list to fix this.",
    };
  }

  revalidatePath("/admin/employees");

  return { success: true, inviteLink };
}

export async function updateEmployee(
  input: EditEmployeeInput & { id: string },
): Promise<EmployeeActionResult> {
  const admin = await requireAdminUser();

  const validation = validateEditEmployeeInput(input);

  if (!validation.valid) {
    return { success: false, fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();

  // Account safety: never let someone change their own role.
  const { data: targetForSelf } = await supabase
    .from("profiles")
    .select("role, is_active, archived_at")
    .eq("id", input.id)
    .maybeSingle();

  if (
    input.id !== admin.id &&
    targetForSelf?.role === "owner"
  ) {
    return {
      success: false,
      error: "Owner accounts cannot be edited.",
    };
  }

  if (
    validation.value.role === "owner" &&
    targetForSelf?.role !== "owner"
  ) {
    return {
      success: false,
      error: "Owner cannot be assigned through this form.",
    };
  }

  if (
    input.id === admin.id &&
    targetForSelf &&
    validation.value.role !== targetForSelf.role
  ) {
    return {
      success: false,
      error: "You cannot change your own role.",
    };
  }

  // Account safety: protect the last owner.
  if (validation.value.role !== "owner") {
    if (
      targetForSelf?.role === "owner" &&
      targetForSelf.is_active &&
      !targetForSelf.archived_at &&
      (await countActiveAdmins()) <= 1
    ) {
      return {
        success: false,
        error: "The last owner's role cannot be changed.",
      };
    }
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

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: validation.value.fullName,
      role: validation.value.role,
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
  const admin = await requireAdminUser();

  // Account safety: never let an admin deactivate themselves — doing so
  // would sign them out (see the ban-based mechanism below) with no other
  // admin action available to undo it.
  if (!isActive && employeeId === admin.id) {
    return {
      success: false,
      error: "You cannot deactivate your own account.",
    };
  }

  const readClient = await createClient();

  // Account safety: protect the last administrator. Deactivating only
  // matters for this invariant when the target is currently one of the
  // active admins being counted — fetch their role first.
  if (!isActive) {
    const { data: targetProfile } = await readClient
      .from("profiles")
      .select("role")
      .eq("id", employeeId)
      .maybeSingle();

    if (targetProfile?.role === "owner" && (await countActiveAdmins()) <= 1) {
      return {
        success: false,
        error: "The last owner cannot be deactivated.",
      };
    }
  }

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
  const admin = await requireAdminUser();

  // Account safety: never let an admin archive themselves — same
  // reasoning as setEmployeeActive, since archiving also bans the account.
  if (employeeId === admin.id) {
    return { success: false, error: "You cannot archive your own account." };
  }

  const readClient = await createClient();

  // Account safety: protect the last administrator.
  const { data: targetProfile } = await readClient
    .from("profiles")
    .select("role")
    .eq("id", employeeId)
    .maybeSingle();

  if (targetProfile?.role === "owner" && (await countActiveAdmins()) <= 1) {
    return {
      success: false,
      error: "The last owner cannot be archived.",
    };
  }

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
  const admin = await requireOwnerUser();
  if (employeeId === admin.id) {
    return {
      success: false,
      error: "You cannot permanently delete your own account.",
    };
  }

  const supabase = await createClient();
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("role, archived_at")
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

  // Account safety: protect the last administrator. Deletion is
  // irreversible, so this checks against ALL admins (not just active
  // ones, unlike the other guards above) — even an archived admin is
  // still recoverable via restoreEmployee, and deleting the org's last one
  // would close that door for good.
  if (profile.role === "owner" && (await countAllAdmins()) <= 1) {
    return {
      success: false,
      error: "The last owner cannot be permanently deleted.",
    };
  }

  const { count: reportCount, error: reportCountError } = await supabase
    .from("daily_reports")
    .select("id", { count: "exact", head: true })
    .eq("author_id", employeeId);

  if (reportCountError) {
    return { success: false, error: "Failed to check employee reports." };
  }

  if ((reportCount ?? 0) > 0) {
    return {
      success: false,
      error:
        "This employee has submitted reports and cannot be permanently deleted. Archive them instead to preserve report history.",
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

export async function assignMemberDepartments(
  memberId: string,
  departmentIds: string[],
): Promise<EmployeeActionResult> {
  await requireAdminUser();

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("profile_departments")
    .delete()
    .eq("profile_id", memberId);

  if (deleteError) {
    return { success: false, error: "Failed to update department assignments." };
  }

  if (departmentIds.length > 0) {
    const { error: insertError } = await supabase
      .from("profile_departments")
      .insert(
        departmentIds.map((department_id) => ({
          profile_id: memberId,
          department_id,
        })),
      );

    if (insertError) {
      return { success: false, error: "Failed to update department assignments." };
    }
  }

  revalidateEmployeePaths(memberId);
  revalidatePath("/admin/departments");

  return { success: true };
}

export async function assignMemberSupervisors(
  memberId: string,
  supervisorIds: string[],
): Promise<EmployeeActionResult> {
  await requireAdminUser();

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("member_supervisors")
    .delete()
    .eq("member_id", memberId);

  if (deleteError) {
    return { success: false, error: "Failed to update supervisor assignments." };
  }

  if (supervisorIds.length > 0) {
    const { error: insertError } = await supabase.from("member_supervisors").insert(
      supervisorIds.map((supervisor_id) => ({
        member_id: memberId,
        supervisor_id,
      })),
    );

    if (insertError) {
      return { success: false, error: "Failed to update supervisor assignments." };
    }
  }

  revalidateEmployeePaths(memberId);

  return { success: true };
}

export interface RegenerateInviteLinkResult {
  success: boolean;
  error?: string;
  inviteLink?: string;
}

export interface InvitationStatus {
  hasActiveInvitation: boolean;
  invitedAt: string | null;
  inviteLink: string | null;
  expiresAt: string | null;
}

// Supabase's default invite token expiry is 24 hours.
const INVITE_EXPIRY_HOURS = 24;

export async function getInvitationStatus(
  email: string
): Promise<InvitationStatus> {
  await requireAdminUser();

  const adminClient = createAdminClient();

  // List users and find the one with matching email
  const { data } = await adminClient.auth.admin.listUsers();
  const user = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return { hasActiveInvitation: false, invitedAt: null, inviteLink: null, expiresAt: null };
  }

  // User has an active invitation if:
  // 1. They have invited_at set
  // 2. They haven't confirmed their email yet (email_confirmed_at is null)
  const hasActiveInvitation = !!user.invited_at && !user.email_confirmed_at;

  // Get the stored invite link from the profile
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("pending_invite_link")
    .eq("id", user.id)
    .maybeSingle();

  // Calculate expiration time (24 hours from invited_at)
  let expiresAt: string | null = null;
  if (user.invited_at) {
    const invitedDate = new Date(user.invited_at);
    const expiresDate = new Date(invitedDate.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
    expiresAt = expiresDate.toISOString();
  }

  return {
    hasActiveInvitation,
    invitedAt: user.invited_at ?? null,
    inviteLink: profile?.pending_invite_link ?? null,
    expiresAt,
  };
}

// Re-inviting an email that already exists but hasn't confirmed yet (still
// "Invited" or "Pending") issues a fresh token for the same auth.users row
// rather than erroring — GoTrue only rejects generateLink(type: "invite")
// with email_exists for an already-CONFIRMED user. The existing profile
// (name/role/department) is untouched: handle_new_user only fires on
// INSERT, and this doesn't create a new auth.users row.
//
// Returns the new invite link so it can be copied/shared manually — this is
// the primary use case when email isn't configured. The old token is
// invalidated by this operation, and the new link is stored for retrieval.
export async function regenerateInviteLink(
  email: string,
): Promise<RegenerateInviteLinkResult> {
  await requireAdminUser();

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${getSiteUrl()}/invite` },
  });

  if (error) {
    return { success: false, error: "Failed to regenerate invite link." };
  }

  // Store the new invite link in the profile for later retrieval
  const inviteLink = data.properties.action_link;
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ pending_invite_link: inviteLink })
    .eq("id", data.user.id);

  revalidatePath("/admin/employees");
  revalidatePath("/admin/invitations");

  return { success: true, inviteLink };
}
