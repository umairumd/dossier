"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerUser } from "@/lib/supabase/require-admin";
import {
  getActorLogContext,
  logActivity,
} from "@/lib/helpers/activity-log";

export interface UpdateOrganizationSettingsResult {
  success: boolean;
  error?: string;
}

async function logOrgSettingsChange(
  actorId: string,
  field: string,
): Promise<void> {
  try {
    const { orgId, actorName } = await getActorLogContext(actorId);
    if (orgId) {
      void logActivity({
        orgId,
        eventType: "org_settings_changed",
        actorId,
        actorName: actorName ?? undefined,
        entityType: "organization",
        metadata: { field },
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log org settings change:", logError);
  }
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

  await logOrgSettingsChange(admin.id, "report_deadline_hour_utc");

  // Every page that computes submission status reads this setting.
  revalidatePath("/", "layout");

  return { success: true };
}

export async function updateOrgName(
  name: string,
): Promise<UpdateOrganizationSettingsResult> {
  const admin = await requireOwnerUser();

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

  await logOrgSettingsChange(admin.id, "org_name");

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateTimezone(
  timezone: string,
): Promise<UpdateOrganizationSettingsResult> {
  const admin = await requireOwnerUser();

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

  await logOrgSettingsChange(admin.id, "timezone");

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateWorkingDays(
  days: number[],
): Promise<UpdateOrganizationSettingsResult> {
  const admin = await requireOwnerUser();

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

  await logOrgSettingsChange(admin.id, "working_days");

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateReportDeadlineLocal(
  hourLocal: number,
): Promise<UpdateOrganizationSettingsResult> {
  const admin = await requireOwnerUser();

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

  await logOrgSettingsChange(admin.id, "report_deadline_hour_local");

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateAttendanceSettings(settings: {
  graceMinutes: number;
  fineLateAmount: number;
  fineVeryLateAmount: number;
  fineUninformedAmount: number;
  informedLeavesPerMonth: number;
  shiftFulltimeStart: string;
  shiftMorningStart: string;
  shiftMorningEnd: string;
  shiftEveningStart: string;
  shiftEveningEnd: string;
}): Promise<UpdateOrganizationSettingsResult> {
  const admin = await requireOwnerUser();

  // Validate grace minutes
  if (
    !Number.isInteger(settings.graceMinutes) ||
    settings.graceMinutes < 0 ||
    settings.graceMinutes > 60
  ) {
    return {
      success: false,
      error: "Grace period must be between 0 and 60 minutes.",
    };
  }

  // Validate fine amounts are non-negative integers
  const fineFields = [
    settings.fineLateAmount,
    settings.fineVeryLateAmount,
    settings.fineUninformedAmount,
  ];
  if (fineFields.some((amount) => !Number.isInteger(amount) || amount < 0)) {
    return {
      success: false,
      error: "Fine amounts must be non-negative whole numbers.",
    };
  }

  // Validate informed leaves per month
  if (
    !Number.isInteger(settings.informedLeavesPerMonth) ||
    settings.informedLeavesPerMonth < 0 ||
    settings.informedLeavesPerMonth > 31
  ) {
    return {
      success: false,
      error: "Informed leaves must be between 0 and 31.",
    };
  }

  // Validate time strings are HH:MM format
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  const timeFields = [
    settings.shiftFulltimeStart,
    settings.shiftMorningStart,
    settings.shiftMorningEnd,
    settings.shiftEveningStart,
    settings.shiftEveningEnd,
  ];
  if (timeFields.some((t) => !timeRegex.test(t))) {
    return { success: false, error: "Shift times must be in HH:MM format." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_settings")
    .update({
      attendance_grace_minutes: settings.graceMinutes,
      fine_late_amount: settings.fineLateAmount,
      fine_very_late_amount: settings.fineVeryLateAmount,
      fine_uninformed_amount: settings.fineUninformedAmount,
      informed_leaves_per_month: settings.informedLeavesPerMonth,
      shift_fulltime_start: settings.shiftFulltimeStart + ":00",
      shift_morning_start: settings.shiftMorningStart + ":00",
      shift_morning_end: settings.shiftMorningEnd + ":00",
      shift_evening_start: settings.shiftEveningStart + ":00",
      shift_evening_end: settings.shiftEveningEnd + ":00",
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Failed to update attendance settings." };
  }

  await logOrgSettingsChange(admin.id, "attendance_settings");

  revalidatePath("/", "layout");
  return { success: true };
}
