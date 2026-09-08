"use server";

import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, requireOwnerUser } from "@/lib/supabase/require-admin";
import {
  countActiveAdmins,
  countAllAdmins,
} from "@/lib/supabase/queries/admin/employees";
import { generateTempPassword } from "@/lib/helpers/temp-password";
import {
  getActorLogContext,
  logActivity,
} from "@/lib/helpers/activity-log";
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
  tempPassword?: string;
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
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/invitations");
}

export async function inviteEmployee(
  input: InviteEmployeeInput,
): Promise<InviteEmployeeResult> {
  await requireAdminUser();

  const validation = validateInviteEmployeeInput(input);

  if (!validation.valid) {
    return { success: false, fieldErrors: validation.fieldErrors };
  }

  const { email, fullName, role, designation, departmentId, supervisorId, isRemote, employmentType } =
    validation.value;
  const adminClient = createAdminClient();
  const tempPassword = generateTempPassword();

  // createUser with a confirmed email and temp password: no invite token,
  // no shareable link, no WhatsApp-preview expiry. The employee logs in
  // normally and is sent to /onboarding until they set a permanent password.
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    if (
      error.code === "email_exists" ||
      error.message?.toLowerCase().includes("already been registered")
    ) {
      return {
        success: false,
        fieldErrors: { email: "An account with this email already exists." },
      };
    }
    return { success: false, error: "Failed to create the invitation." };
  }

  const userId = data.user.id;

  // The signup trigger (handle_new_user) already created a baseline
  // profile (role='member'); this applies the role and name the admin
  // chose. Department assignment is a separate action.
  // Shift is NOT assigned here — use Assign Shift on the employee detail
  // page after invite.
  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role,
    })
    .eq("id", userId);

  if (profileError) {
    return {
      success: false,
      error:
        "Invitation created, but couldn't set the employee's role. Edit them from the list to fix this.",
    };
  }

  const profileUpdate: Record<string, unknown> = {
    is_remote: isRemote ?? false,
    employment_type: employmentType ?? "full_time",
  };
  if (designation) {
    profileUpdate.designation = designation;
  }

  const { error: extensionError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (extensionError) {
    console.error("Failed to set invite profile extensions.", extensionError);
  }

  if (departmentId) {
    const { error: departmentError } = await supabase
      .from("profile_departments")
      .insert({ profile_id: userId, department_id: departmentId });

    if (departmentError) {
      console.error("Failed to assign department on invite.", departmentError);
    }
  }

  if (supervisorId) {
    const { error: supervisorError } = await supabase
      .from("member_supervisors")
      .insert({ member_id: userId, supervisor_id: supervisorId });

    if (supervisorError) {
      console.error("Failed to assign supervisor on invite.", supervisorError);
    }
  }

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (adminUser) {
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("organization_id, full_name")
      .eq("id", adminUser.id)
      .maybeSingle();

    const orgId = adminProfile?.organization_id;
    if (orgId) {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId)
        .in("role", ["owner", "admin"]);

      await Promise.all(
        (admins ?? []).map((admin) =>
          createNotification({
            orgId,
            profileId: admin.id,
            type: "employee_invited",
            title: `${fullName} has been invited`,
            entityType: "employee",
            entityId: userId,
          }),
        ),
      );

      void logActivity({
        orgId,
        eventType: "employee_invited",
        actorId: adminUser.id,
        actorName: adminProfile?.full_name ?? undefined,
        targetId: userId,
        targetName: fullName,
        entityType: "employee",
        entityId: userId,
        entityName: fullName,
      });
    }
  }

  revalidatePath("/employees");
  revalidatePath("/invitations");

  return { success: true, tempPassword };
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
      designation: validation.value.designation,
      is_remote: validation.value.isRemote,
      date_of_birth: validation.value.dateOfBirth,
    })
    .eq("id", input.id);

  if (error) {
    return { success: false, error: "Failed to update employee." };
  }

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    if (orgId) {
      void logActivity({
        orgId,
        eventType: "employee_edited",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        targetId: input.id,
        targetName: validation.value.fullName,
        entityType: "employee",
        entityId: input.id,
        entityName: validation.value.fullName,
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log employee edit:", logError);
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

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    const { data: target } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", employeeId)
      .maybeSingle();

    if (orgId) {
      void logActivity({
        orgId,
        eventType: isActive ? "employee_reactivated" : "employee_deactivated",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        targetId: employeeId,
        targetName: target?.full_name ?? undefined,
        entityType: "employee",
        entityId: employeeId,
        entityName: target?.full_name ?? undefined,
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log employee status change:", logError);
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

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    const { data: target } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", employeeId)
      .maybeSingle();

    if (orgId) {
      void logActivity({
        orgId,
        eventType: "employee_archived",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        targetId: employeeId,
        targetName: target?.full_name ?? undefined,
        entityType: "employee",
        entityId: employeeId,
        entityName: target?.full_name ?? undefined,
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log employee archive:", logError);
  }

  revalidateEmployeePaths(employeeId);
  revalidatePath("/admin/departments");
  revalidatePath("/departments");

  return { success: true };
}

export async function restoreEmployee(
  employeeId: string,
): Promise<EmployeeActionResult> {
  const admin = await requireAdminUser();

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

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    const { data: target } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", employeeId)
      .maybeSingle();

    if (orgId) {
      void logActivity({
        orgId,
        eventType: "employee_restored",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        targetId: employeeId,
        targetName: target?.full_name ?? undefined,
        entityType: "employee",
        entityId: employeeId,
        entityName: target?.full_name ?? undefined,
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log employee restore:", logError);
  }

  revalidateEmployeePaths(employeeId);
  revalidatePath("/admin/departments");
  revalidatePath("/departments");

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

  revalidatePath("/employees");
  revalidatePath("/admin/departments");
  revalidatePath("/departments");

  return { success: true };
}

export async function assignMemberDepartments(
  memberId: string,
  departmentIds: string[],
): Promise<EmployeeActionResult> {
  const admin = await requireAdminUser();

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

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    const adminClient = createAdminClient();
    const [{ data: target }, { data: depts }] = await Promise.all([
      adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", memberId)
        .maybeSingle(),
      departmentIds.length > 0
        ? adminClient
            .from("departments")
            .select("name")
            .in("id", departmentIds)
        : Promise.resolve({ data: [] as { name: string }[] }),
    ]);

    const deptNames = (depts ?? []).map((d) => d.name).join(", ") || "none";

    if (orgId) {
      void logActivity({
        orgId,
        eventType: "department_assigned",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        targetId: memberId,
        targetName: target?.full_name ?? undefined,
        entityType: "department",
        entityName: deptNames,
        metadata: { departmentIds },
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log department assignment:", logError);
  }

  revalidateEmployeePaths(memberId);
  revalidatePath("/admin/departments");
  revalidatePath("/departments");

  return { success: true };
}

export async function assignMemberSupervisors(
  memberId: string,
  supervisorIds: string[],
): Promise<EmployeeActionResult> {
  const admin = await requireAdminUser();

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

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    const adminClient = createAdminClient();
    const [{ data: target }, { data: supervisors }] = await Promise.all([
      adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", memberId)
        .maybeSingle(),
      supervisorIds.length > 0
        ? adminClient
            .from("profiles")
            .select("full_name")
            .in("id", supervisorIds)
        : Promise.resolve({ data: [] as { full_name: string }[] }),
    ]);

    const supervisorNames =
      (supervisors ?? []).map((s) => s.full_name).join(", ") || "none";

    if (orgId) {
      void logActivity({
        orgId,
        eventType: "supervisor_assigned",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        targetId: memberId,
        targetName: target?.full_name ?? undefined,
        entityType: "employee",
        entityName: supervisorNames,
        metadata: { supervisorIds },
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log supervisor assignment:", logError);
  }

  revalidateEmployeePaths(memberId);

  return { success: true };
}
