"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerUser } from "@/lib/supabase/require-admin";

export interface UpdateOrganizationSettingsResult {
  success: boolean;
  error?: string;
}

export async function updateReportDeadline(
  hourUtc: number,
): Promise<UpdateOrganizationSettingsResult> {
  const admin = await requireOwnerUser();

  if (!Number.isInteger(hourUtc) || hourUtc < 0 || hourUtc > 23) {
    return { success: false, error: "Enter an hour between 0 and 23." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_settings")
    .update({
      report_deadline_hour_utc: hourUtc,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Failed to update the report deadline." };
  }

  // Every page that computes submission status reads this setting.
  revalidatePath("/", "layout");

  return { success: true };
}

export async function updateOrgName(
  name: string,
): Promise<UpdateOrganizationSettingsResult> {
  await requireOwnerUser();

  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Organization name cannot be empty." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_settings")
    .update({ org_name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Failed to update organization name." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateTimezone(
  timezone: string,
): Promise<UpdateOrganizationSettingsResult> {
  await requireOwnerUser();

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return { success: false, error: "Invalid timezone." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_settings")
    .update({ timezone, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Failed to update timezone." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateWorkingDays(
  days: number[],
): Promise<UpdateOrganizationSettingsResult> {
  await requireOwnerUser();

  if (days.length === 0) {
    return { success: false, error: "At least one working day is required." };
  }

  if (days.some((day) => day < 1 || day > 7)) {
    return { success: false, error: "Invalid day value." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_settings")
    .update({
      working_days: days,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Failed to update working days." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateReportDeadlineLocal(
  hourLocal: number,
): Promise<UpdateOrganizationSettingsResult> {
  await requireOwnerUser();

  if (!Number.isInteger(hourLocal) || hourLocal < 0 || hourLocal > 23) {
    return { success: false, error: "Enter an hour between 0 and 23." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_settings")
    .update({
      report_deadline_hour_local: hourLocal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Failed to update the report deadline." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
