"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdminUser,
  requireOwnerUser,
} from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";
import { insertLeaveBalanceRecord } from "@/lib/helpers/leave-balance";
import type { AttendanceStatus, ShiftType } from "@/types/attendance";

export interface AttendanceActionResult {
  success: boolean;
  error?: string;
}

export async function assignShiftAction(
  profileId: string,
  orgId: string,
  shiftType: ShiftType,
  effectiveFrom: string,
): Promise<AttendanceActionResult> {
  await requireAdminUser();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Close any currently open shift
  await supabase
    .from("shift_assignments")
    .update({ effective_to: effectiveFrom })
    .eq("profile_id", profileId)
    .is("effective_to", null)
    .lte("effective_from", today);

  // Insert new shift
  const { error } = await supabase.from("shift_assignments").insert({
    profile_id: profileId,
    org_id: orgId,
    shift_type: shiftType,
    effective_from: effectiveFrom,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/employees/${profileId}`);
  return { success: true };
}

export async function saveAttendanceRecordAction(record: {
  profileId: string;
  orgId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  fineAmount: number;
  leaveDeducted: number;
  notes?: string | null;
}): Promise<AttendanceActionResult> {
  await requireAdminUser();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from("attendance_records").upsert(
    {
      profile_id: record.profileId,
      org_id: record.orgId,
      date: record.date,
      status: record.status,
      check_in_time: record.checkInTime ?? null,
      fine_amount: record.fineAmount,
      leave_deducted: record.leaveDeducted,
      source: "manual",
      recorded_by: userData.user?.id ?? null,
      notes: record.notes ?? null,
    },
    { onConflict: "org_id,profile_id,date" },
  );

  if (error) return { success: false, error: error.message };
  revalidatePath("/attendance");
  return { success: true };
}

export async function reviewLeaveRequestAction(
  requestId: string,
  action: "approved" | "rejected",
  adminNotes?: string,
): Promise<AttendanceActionResult> {
  await requireAdminUser();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: req, error: fetchError } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !req) {
    return { success: false, error: "Leave request not found." };
  }

  const { error: updateError } = await supabase
    .from("leave_requests")
    .update({
      status: action,
      admin_notes: adminNotes ?? null,
      reviewed_by: userData.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) return { success: false, error: updateError.message };

  if (action === "approved") {
    const leaveDeducted = req.type === "full_day" ? 1 : 0.5;

    await supabase.from("attendance_records").upsert(
      {
        profile_id: req.profile_id,
        org_id: req.org_id,
        date: req.date,
        status: req.type === "full_day" ? "leave" : "half_leave",
        fine_amount: 0,
        leave_deducted: leaveDeducted,
        source: "manual",
        recorded_by: userData.user?.id ?? null,
      },
      { onConflict: "org_id,profile_id,date" },
    );

    const { data: balance } = await supabase
      .from("leave_balances")
      .select("id, total_used")
      .eq("profile_id", req.profile_id)
      .eq("status", "active")
      .maybeSingle();

    if (balance) {
      await supabase
        .from("leave_balances")
        .update({ total_used: Number(balance.total_used) + leaveDeducted })
        .eq("id", balance.id);
    }
  }

  revalidatePath("/attendance");
  return { success: true };
}

export async function initLeaveBalanceAction(
  profileId: string,
  orgId: string,
  joinDate: string,
): Promise<AttendanceActionResult> {
  await requireAdminUser();
  const supabase = await createClient();
  const result = await insertLeaveBalanceRecord(
    supabase,
    profileId,
    orgId,
    joinDate,
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/employees/${profileId}`);
  return { success: true };
}

export async function runMonthlyAccrualAction(): Promise<{
  success: boolean;
  updatedCount: number;
  error?: string;
}> {
  await requireOwnerUser();
  const supabase = await createClient();

  const { data: balances, error: fetchError } = await supabase
    .from("leave_balances")
    .select("id, total_accrued")
    .eq("status", "active");

  if (fetchError) {
    return { success: false, updatedCount: 0, error: fetchError.message };
  }

  let updatedCount = 0;

  for (const balance of balances ?? []) {
    const nextAccrued = Math.min(Number(balance.total_accrued) + 2, 24);
    if (nextAccrued === Number(balance.total_accrued)) {
      continue;
    }

    const { error } = await supabase
      .from("leave_balances")
      .update({ total_accrued: nextAccrued })
      .eq("id", balance.id);

    if (!error) {
      updatedCount += 1;
    }
  }

  revalidatePath("/attendance");
  return { success: true, updatedCount };
}
