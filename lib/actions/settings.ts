"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgAdminIds, notifyGrouped } from "@/lib/notifications/grouped";

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
  fieldErrors?: { fullName?: string };
}

// Touches full_name and optional date_of_birth. role/department_id are
// blocked for self-updates by the profiles_role_department_immutability
// trigger regardless, and email changes go through the Admin API
// (admin-only — see lib/actions/admin/employees.ts), not this action.
export async function updateOwnProfile(
  fullName: string,
  dateOfBirth?: string | null,
): Promise<UpdateProfileResult> {
  const trimmed = fullName.trim();

  if (!trimmed) {
    return { success: false, fieldErrors: { fullName: "Name is required." } };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const update: { full_name: string; date_of_birth?: string | null } = {
    full_name: trimmed,
  };
  // DOB saves must not send birthday notifications — those run only from
  // the hourly cron (app/api/cron/birthdays), once per org-local day.
  if (dateOfBirth !== undefined) {
    update.date_of_birth = dateOfBirth?.trim() || null;
  }

  const { data: before } = await supabase
    .from("profiles")
    .select("full_name, date_of_birth, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Failed to update profile." };
  }

  if (before?.organization_id) {
    try {
      await notifyAdminsOfProfileEdit(user.id, before.organization_id, before, update);
    } catch (notifyError) {
      console.error("[settings] Failed to notify admins:", notifyError);
    }
  }

  revalidatePath("/settings/profile");
  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true };
}

function formatBirthday(value: string | null | undefined): string {
  if (!value) return "removed";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

// Admins hear when someone changes their own name or birthday: one grouped
// row per person until it is read.
async function notifyAdminsOfProfileEdit(
  userId: string,
  orgId: string,
  before: { full_name: string | null; date_of_birth: string | null },
  after: { full_name: string; date_of_birth?: string | null },
): Promise<void> {
  const changes: { field: string; detail: string }[] = [];
  if ((before.full_name ?? "") !== after.full_name) {
    changes.push({
      field: "name",
      detail: `Name: ${before.full_name ?? "none"} to ${after.full_name}`,
    });
  }
  if (
    after.date_of_birth !== undefined &&
    (before.date_of_birth ?? null) !== (after.date_of_birth ?? null)
  ) {
    changes.push({
      field: "birthday",
      detail: `Birthday: ${formatBirthday(after.date_of_birth)}`,
    });
  }
  if (changes.length === 0) return;

  const adminClient = createAdminClient();
  const fields = changes.map((change) => change.field).join(" and ");
  await notifyGrouped(adminClient, {
    orgId,
    recipientIds: await getOrgAdminIds(adminClient, orgId, [userId]),
    type: "profile_updated",
    entityType: "employee",
    entityId: userId,
    title: (count) =>
      count === 1
        ? `${after.full_name} updated their ${fields}`
        : `${after.full_name} updated their profile ${count} times`,
    body: () => changes.map((change) => change.detail).join(", "),
  });
}
