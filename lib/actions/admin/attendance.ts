"use server";

import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeAccruedForWindow,
  contractYearWindow,
  insertLeaveBalanceRecord,
  ledgerRemaining,
  toContractStartFirst,
} from "@/lib/helpers/leave-balance";
import {
  getActorLogContext,
  logActivity,
} from "@/lib/helpers/activity-log";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getReportByAuthorAndDate } from "@/lib/supabase/queries/reports";
import type { AttendanceStatus, ShiftType } from "@/types/attendance";
import { SHIFT_TYPE_LABELS } from "@/types/attendance";
import type { DailyReport } from "@/types/report";

export interface AttendanceActionResult {
  success: boolean;
  error?: string;
}

type AttendanceSupabase = Awaited<ReturnType<typeof createClient>>;

async function fetchExistingLeaveDeducted(
  supabase: AttendanceSupabase,
  orgId: string,
  profileId: string,
  date: string,
): Promise<number> {
  const { data } = await supabase
    .from("attendance_records")
    .select("leave_deducted")
    .eq("org_id", orgId)
    .eq("profile_id", profileId)
    .eq("date", date)
    .maybeSingle();

  return data?.leave_deducted != null ? Number(data.leave_deducted) : 0;
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Applies a leave delta to the active contract-year ledger:
 *   leave_balances.total_used += delta
 *
 * `delta` is days consumed; negative values refund. No floor is applied —
 * negative balances are intentional. profiles.leave_balance is updated by
 * the leave_balances sync trigger.
 */
async function adjustLeaveLedgers(
  adminClient: AdminClient,
  profileId: string,
  delta: number,
): Promise<AttendanceActionResult> {
  if (delta === 0) {
    return { success: true };
  }

  const { data: ledger, error: ledgerFetchError } = await adminClient
    .from("leave_balances")
    .select("id, total_used")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (ledgerFetchError) {
    return { success: false, error: ledgerFetchError.message };
  }

  if (!ledger) {
    return {
      success: false,
      error: "No active leave balance found for this employee.",
    };
  }

  const { error: ledgerUpdateError } = await adminClient
    .from("leave_balances")
    .update({ total_used: Number(ledger.total_used) + delta })
    .eq("id", ledger.id);

  if (ledgerUpdateError) {
    console.error(
      `[leave] Failed to update leave_balances.total_used for ${profileId}:`,
      ledgerUpdateError.message,
    );
    return { success: false, error: ledgerUpdateError.message };
  }

  return { success: true };
}

export async function assignShiftAction(
  profileId: string,
  orgId: string,
  shiftType: ShiftType,
  effectiveFrom: string,
): Promise<AttendanceActionResult> {
  const admin = await requireAdminUser();

  if (!orgId || orgId.trim() === "") {
    return { success: false, error: "Organization ID is required." };
  }

  const adminClient = createAdminClient();

  // Close any currently open shift — use admin client to bypass RLS
  // createClient() RLS was silently failing, causing duplicate open rows
  const { error: closeError } = await adminClient
    .from("shift_assignments")
    .update({ effective_to: effectiveFrom })
    .eq("profile_id", profileId)
    .is("effective_to", null);

  if (closeError) {
    console.error("[assignShift] Failed to close existing shift:", closeError);
  }

  // Insert new shift
  const { error } = await adminClient.from("shift_assignments").insert({
    profile_id: profileId,
    org_id: orgId,
    shift_type: shiftType,
    effective_from: effectiveFrom,
  });

  if (error) return { success: false, error: error.message };

  try {
    const { actorName } = await getActorLogContext(admin.id);
    const { data: target } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", profileId)
      .maybeSingle();

    void logActivity({
      orgId,
      eventType: "shift_assigned",
      actorId: admin.id,
      actorName: actorName ?? undefined,
      targetId: profileId,
      targetName: target?.full_name ?? undefined,
      entityType: "shift",
      entityName: shiftType,
      metadata: { effectiveFrom },
    });

    void createNotification({
      orgId,
      profileId,
      type: "shift_assigned",
      title: "Your shift has been assigned",
      body: SHIFT_TYPE_LABELS[shiftType] ?? shiftType,
      entityType: "employee",
      entityId: profileId,
    });
  } catch (logError) {
    console.error("[activity-log] Failed to log shift assignment:", logError);
  }

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
  const admin = await requireAdminUser();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const oldLeaveDeducted = await fetchExistingLeaveDeducted(
    supabase,
    record.orgId,
    record.profileId,
    record.date,
  );
  const delta = record.leaveDeducted - oldLeaveDeducted;
  const adminClient = createAdminClient();

  // Ledger first so a failed balance write never leaves an orphan leave day.
  const balanceResult = await adjustLeaveLedgers(
    adminClient,
    record.profileId,
    delta,
  );
  if (!balanceResult.success) {
    return balanceResult;
  }

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

  if (error) {
    if (delta !== 0) {
      const reverseResult = await adjustLeaveLedgers(
        adminClient,
        record.profileId,
        -delta,
      );
      if (!reverseResult.success) {
        console.error(
          `[leave] LEDGER MISMATCH: could not reverse ${delta} day(s) for profile ${record.profileId} after attendance write failed:`,
          reverseResult.error,
        );
      }
    }
    return { success: false, error: error.message };
  }

  try {
    const { actorName } = await getActorLogContext(admin.id);
    const { data: target } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", record.profileId)
      .maybeSingle();

    void logActivity({
      orgId: record.orgId,
      eventType: "attendance_recorded",
      actorId: admin.id,
      actorName: actorName ?? undefined,
      targetId: record.profileId,
      targetName: target?.full_name ?? undefined,
      entityType: "attendance",
      entityName: record.status,
      metadata: { date: record.date, status: record.status },
    });
  } catch (logError) {
    console.error("[activity-log] Failed to log attendance record:", logError);
  }

  revalidatePath("/attendance");
  return { success: true };
}

const LEAVE_ALREADY_REVIEWED_ERROR = "This request was already reviewed.";
const LEAVE_LEDGER_ERROR =
  "Leave approved but balance could not be updated. Please check this employee's leave balance manually.";

export async function reviewLeaveRequestAction(
  requestId: string,
  action: "approved" | "rejected",
  adminNotes?: string,
): Promise<AttendanceActionResult> {
  const admin = await requireAdminUser();
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: req, error: fetchError } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !req) {
    return { success: false, error: "Leave request not found." };
  }

  if (req.status !== "pending") {
    return { success: false, error: LEAVE_ALREADY_REVIEWED_ERROR };
  }

  // Claim the request atomically: only one concurrent reviewer can move it
  // out of "pending", which protects against double-clicks and two admins.
  const { data: claimed, error: claimError } = await supabase
    .from("leave_requests")
    .update({
      status: action,
      admin_notes: adminNotes ?? null,
      reviewed_by: userData.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id");

  if (claimError) return { success: false, error: claimError.message };

  if (!claimed || claimed.length === 0) {
    return { success: false, error: LEAVE_ALREADY_REVIEWED_ERROR };
  }

  const revertClaim = async () => {
    const { error: revertError } = await adminClient
      .from("leave_requests")
      .update({
        status: "pending",
        admin_notes: null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", requestId);

    if (revertError) {
      console.error(
        `[leave] Failed to revert leave request ${requestId} to pending:`,
        revertError,
      );
    }
  };

  if (action === "approved") {
    const leaveDeducted = req.type === "full_day" ? 1 : 0.5;

    const oldLeaveDeducted = await fetchExistingLeaveDeducted(
      supabase,
      req.org_id,
      req.profile_id,
      req.date,
    );
    const delta = leaveDeducted - oldLeaveDeducted;

    // (a) Ledgers first, so a failure here leaves no attendance row to undo.
    const ledgerResult = await adjustLeaveLedgers(
      adminClient,
      req.profile_id,
      delta,
    );

    if (!ledgerResult.success) {
      console.error(
        `[leave] Ledger update failed while approving request ${requestId} (profile ${req.profile_id}):`,
        ledgerResult.error,
      );
      await revertClaim();
      return { success: false, error: LEAVE_LEDGER_ERROR };
    }

    // (b) Attendance row.
    const { error: attendanceError } = await supabase
      .from("attendance_records")
      .upsert(
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

    if (attendanceError) {
      // (c) Reverse the ledger change and release the request.
      const reverseResult = await adjustLeaveLedgers(
        adminClient,
        req.profile_id,
        -delta,
      );
      if (!reverseResult.success) {
        console.error(
          `[leave] LEDGER MISMATCH: could not reverse ${delta} day(s) for profile ${req.profile_id} after attendance write failed (request ${requestId}):`,
          reverseResult.error,
        );
      }
      await revertClaim();
      return { success: false, error: attendanceError.message };
    }
  }

  // Notify and log only after every write has succeeded.
  await createNotification({
    orgId: req.org_id,
    profileId: req.profile_id,
    type: action === "approved" ? "leave_approved" : "leave_rejected",
    title: action === "approved" ? "Leave approved" : "Leave request rejected",
    body: req.date,
    entityType: "leave_request",
    entityId: req.id,
  });

  try {
    const { actorName } = await getActorLogContext(admin.id);
    const { data: target } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", req.profile_id)
      .maybeSingle();

    void logActivity({
      orgId: req.org_id,
      eventType: action === "approved" ? "leave_approved" : "leave_rejected",
      actorId: admin.id,
      actorName: actorName ?? undefined,
      targetId: req.profile_id,
      targetName: target?.full_name ?? undefined,
      entityType: "leave_request",
      entityId: req.id,
      metadata: { date: req.date, type: req.type },
    });
  } catch (logError) {
    console.error("[activity-log] Failed to log leave review:", logError);
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
  const result = await insertLeaveBalanceRecord(
    createAdminClient(),
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

export async function adjustLeaveBalance(
  profileId: string,
  adjustment: number,
  note: string,
): Promise<AttendanceActionResult> {
  await requireAdminUser();

  const trimmedNote = note.trim();
  if (trimmedNote.length < 10) {
    return { success: false, error: "A reason is required." };
  }

  if (!Number.isFinite(adjustment) || adjustment === 0) {
    return {
      success: false,
      error: "Enter a non-zero number of days to adjust.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const adminClient = createAdminClient();
  const { data: balance, error: fetchError } = await adminClient
    .from("leave_balances")
    .select("id, total_accrued")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!balance) {
    return {
      success: false,
      error: "No active leave balance found for this employee.",
    };
  }

  const previousAccrued = Number(balance.total_accrued);
  // Floor at 0: a large negative adjust cannot push accrued below zero.
  // The applied delta may be smaller than the requested adjustment.
  const nextAccrued = Math.max(0, previousAccrued + adjustment);
  const appliedAdjustment = nextAccrued - previousAccrued;

  const { data: profile, error: profileFetchError } = await adminClient
    .from("profiles")
    .select("organization_id, full_name")
    .eq("id", profileId)
    .maybeSingle();

  if (profileFetchError) {
    return { success: false, error: profileFetchError.message };
  }

  if (!profile) {
    return { success: false, error: "Employee profile not found." };
  }

  if (appliedAdjustment === 0 && adjustment !== 0) {
    return {
      success: false,
      error: "Leave accrued is already at zero; cannot reduce further.",
    };
  }

  const { error: updateError } = await adminClient
    .from("leave_balances")
    .update({
      total_accrued: nextAccrued,
      updated_at: new Date().toISOString(),
    })
    .eq("id", balance.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: auditError } = await adminClient
    .from("leave_balance_adjustments")
    .insert({
      leave_balance_id: balance.id,
      profile_id: profileId,
      adjusted_by: user.id,
      adjustment: appliedAdjustment,
      note: trimmedNote,
    });

  if (auditError) {
    console.error(
      "[leave] Failed to insert leave_balance_adjustments audit row:",
      auditError,
    );
  }

  // Make the change visible: the employee is told, and it shows in activity
  // with the reason (the dialog promises it is logged with name and reason).
  if (profile.organization_id) {
    const signed = `${appliedAdjustment > 0 ? "+" : ""}${appliedAdjustment}`;
    const unit = Math.abs(appliedAdjustment) === 1 ? "day" : "days";
    await createNotification({
      orgId: profile.organization_id,
      profileId,
      type: "leave_balance_adjusted",
      title: `Leave balance adjusted by ${signed} ${unit}`,
      body: trimmedNote,
      entityType: "leave_balance",
      entityId: balance.id,
    });

    try {
      const { actorName } = await getActorLogContext(user.id);
      void logActivity({
        orgId: profile.organization_id,
        eventType: "leave_balance_adjusted",
        actorId: user.id,
        actorName: actorName ?? undefined,
        targetId: profileId,
        targetName: profile.full_name ?? undefined,
        entityType: "leave_balance",
        entityId: balance.id,
        metadata: { adjustment: appliedAdjustment, note: trimmedNote },
      });
    } catch (logError) {
      console.error("[activity-log] Failed to log leave adjustment:", logError);
    }
  }

  revalidatePath(`/employees/${profileId}`);
  revalidatePath("/attendance");
  return { success: true };
}

const ACCRUAL_ALREADY_RUN_ERROR = "Accrual already run for this month";

export async function runMonthlyAccrualAction(
  year: number,
  month: number,
): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const admin = await requireAdminUser();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      success: false,
      count: 0,
      error: "Cannot run accrual for a past month",
    };
  }

  const adminClient = createAdminClient();

  const { error: rolloverError } = await adminClient.rpc(
    "rollover_expired_leave_balances",
  );
  if (rolloverError) {
    return { success: false, count: 0, error: rolloverError.message };
  }

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

  const [{ data: eligible, error: profilesError }, { data: existingAccruals, error: existingError }] =
    await Promise.all([
      adminClient
        .from("profiles")
        .select("id")
        .eq("is_active", true)
        .is("archived_at", null)
        .eq("exclude_from_attendance", false),
      adminClient
        .from("leave_accruals")
        .select("profile_id")
        .eq("year", year)
        .eq("month", month),
    ]);

  if (profilesError) {
    return { success: false, count: 0, error: profilesError.message };
  }

  if (existingError) {
    return { success: false, count: 0, error: existingError.message };
  }

  // Retry-safe: only profiles without an accrual row for this month are
  // pending, so a partially failed run can be re-run to finish the rest.
  const alreadyCredited = new Set(
    (existingAccruals ?? []).map((row) => row.profile_id),
  );
  const pending = (eligible ?? []).filter(
    (profile) => !alreadyCredited.has(profile.id),
  );

  if (pending.length === 0) {
    return {
      success: false,
      count: 0,
      error: ACCRUAL_ALREADY_RUN_ERROR,
    };
  }

  // Claim the accrual rows first. With ignoreDuplicates, only rows this call
  // actually inserted are returned, so concurrent runs can't double-credit.
  const { data: inserted, error: insertError } = await adminClient
    .from("leave_accruals")
    .upsert(
      pending.map((profile) => ({
        profile_id: profile.id,
        year,
        month,
        credited: 2,
      })),
      { onConflict: "profile_id,year,month", ignoreDuplicates: true },
    )
    .select("profile_id");

  if (insertError) {
    return { success: false, count: 0, error: insertError.message };
  }

  const creditedProfileIds = (inserted ?? []).map((row) => row.profile_id);
  const count = creditedProfileIds.length;
  const failed: string[] = [];

  if (count > 0) {
    const { data: balances, error: fetchError } = await adminClient
      .from("leave_balances")
      .select(
        "id, profile_id, total_accrued, contract_year_start, contract_year_end",
      )
      .eq("status", "active")
      .in("profile_id", creditedProfileIds);

    if (fetchError) {
      console.error("[accrual] Failed to load leave_balances:", fetchError);
      for (const profileId of creditedProfileIds) {
        failed.push(profileId);
        const { error: rollbackError } = await adminClient
          .from("leave_accruals")
          .delete()
          .eq("profile_id", profileId)
          .eq("year", year)
          .eq("month", month);
        if (rollbackError) {
          console.error(
            "[accrual] Failed to roll back accrual row:",
            profileId,
            rollbackError,
          );
        }
      }
    } else {
      const balanceByProfile = new Map(
        (balances ?? []).map((row) => [row.profile_id, row]),
      );

      for (const profileId of creditedProfileIds) {
        const balance = balanceByProfile.get(profileId);
        if (!balance) {
          // No active ledger — leave the accrual claim so we don't retry
          // every month forever; remaining is still zero until init.
          continue;
        }

        if (
          monthStart < balance.contract_year_start ||
          monthStart > balance.contract_year_end
        ) {
          continue;
        }

        const nextAccrued = Math.min(Number(balance.total_accrued) + 2, 24);
        if (nextAccrued === Number(balance.total_accrued)) {
          continue;
        }

        const { error: balanceError } = await adminClient
          .from("leave_balances")
          .update({ total_accrued: nextAccrued })
          .eq("id", balance.id);

        if (balanceError) {
          console.error(
            "[accrual] Failed to update leave_balances:",
            balance.id,
            balanceError,
          );
          failed.push(profileId);
          const { error: rollbackError } = await adminClient
            .from("leave_accruals")
            .delete()
            .eq("profile_id", profileId)
            .eq("year", year)
            .eq("month", month);
          if (rollbackError) {
            console.error(
              "[accrual] Failed to roll back accrual row:",
              profileId,
              rollbackError,
            );
          }
        }
      }
    }
  }

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    if (orgId) {
      void logActivity({
        orgId,
        eventType: "accrual_run",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        entityType: "leave_balance",
        metadata: { count: count - failed.length, year, month },
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log accrual run:", logError);
  }

  revalidatePath("/attendance");

  if (failed.length > 0) {
    return {
      success: false,
      count: count - failed.length,
      error: `Accrual failed for ${failed.length} employee${failed.length === 1 ? "" : "s"}. Run it again to retry.`,
    };
  }

  return { success: true, count };
}

export async function clearAttendanceAction(
  employeeId: string,
  date: string,
): Promise<AttendanceActionResult> {
  await requireAdminUser();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("attendance_records")
    .select("leave_deducted")
    .eq("profile_id", employeeId)
    .eq("date", date)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const oldLeaveDeducted =
    existing?.leave_deducted != null ? Number(existing.leave_deducted) : 0;

  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("profile_id", employeeId)
    .eq("date", date);

  if (error) return { success: false, error: error.message };

  if (oldLeaveDeducted > 0) {
    const balanceResult = await adjustLeaveLedgers(
      createAdminClient(),
      employeeId,
      -oldLeaveDeducted,
    );
    if (!balanceResult.success) {
      return balanceResult;
    }
  }

  revalidatePath("/attendance");
  return { success: true };
}

export async function markDayAsHolidayAction(
  date: string,
  orgId: string,
  holidayName: string = "",
): Promise<{ success: boolean; count: number; error?: string }> {
  const admin = await requireAdminUser();
  const adminClient = createAdminClient();

  if (!orgId) {
    return { success: false, count: 0, error: "Organization not found." };
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("is_active", true)
    .is("archived_at", null)
    .eq("exclude_from_attendance", false);

  if (profilesError) {
    return { success: false, count: 0, error: profilesError.message };
  }

  const profileIds = (profiles ?? []).map((profile) => profile.id);
  if (profileIds.length === 0) {
    return {
      success: false,
      count: 0,
      error: "No eligible employee profiles found",
    };
  }

  const { data: existingRows, error: existingError } = await adminClient
    .from("attendance_records")
    .select("profile_id, status")
    .eq("org_id", orgId)
    .eq("date", date)
    .in("profile_id", profileIds);

  if (existingError) {
    return { success: false, count: 0, error: existingError.message };
  }

  const skipIds = new Set(
    (existingRows ?? [])
      .filter(
        (row) => row.status === "leave" || row.status === "half_leave",
      )
      .map((row) => row.profile_id),
  );

  const targets = profileIds.filter((id) => !skipIds.has(id));
  if (targets.length === 0) {
    revalidatePath("/attendance");
    return { success: true, count: 0 };
  }

  const trimmedName = holidayName.trim();

  const { error: upsertError } = await adminClient
    .from("attendance_records")
    .upsert(
      targets.map((profileId) => ({
        profile_id: profileId,
        org_id: orgId,
        date,
        status: "holiday" as const,
        check_in_time: null,
        fine_amount: 0,
        leave_deducted: 0,
        source: "manual",
        recorded_by: admin.id,
        notes: null,
        // Requires attendance_records.holiday_name (see migration
        // 20260929125000_add_holiday_name_to_attendance.sql)
        holiday_name: trimmedName || null,
      })),
      { onConflict: "org_id,profile_id,date" },
    );

  if (upsertError) {
    return { success: false, count: 0, error: upsertError.message };
  }

  revalidatePath("/attendance");
  return { success: true, count: targets.length };
}

export async function unmarkHolidayAction(
  date: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("date", date)
    .eq("status", "holiday");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/attendance");
  return { success: true };
}

export async function fetchReportForAttendance(
  authorId: string,
  date: string,
): Promise<{ success: boolean; report?: DailyReport; error?: string }> {
  await requireAdminUser();

  try {
    const report = await getReportByAuthorAndDate(authorId, date);
    if (!report) {
      return { success: false, error: "Report not found." };
    }
    return { success: true, report };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load report.",
    };
  }
}

export type ContractStartSnapshot = {
  windowStart: string;
  windowEnd: string;
  accrued: number;
  used: number;
  remaining: number;
};

export type ContractStartPreview = {
  contractStart: string;
  before: ContractStartSnapshot | null;
  after: ContractStartSnapshot;
};

async function sumActiveLeaveAdjustments(
  adminClient: ReturnType<typeof createAdminClient>,
  profileId: string,
): Promise<number> {
  const { data } = await adminClient
    .from("leave_balance_adjustments")
    .select("adjustment, leave_balances!inner(status)")
    .eq("profile_id", profileId)
    .eq("leave_balances.status", "active");
  return (data ?? []).reduce(
    (sum, row) => sum + Number(row.adjustment ?? 0),
    0,
  );
}

async function loadContractStartPreview(
  adminClient: ReturnType<typeof createAdminClient>,
  profileId: string,
  orgId: string,
  currentContractStart: string,
  nextContractStart: string,
): Promise<ContractStartPreview> {
  const afterWindow = contractYearWindow(nextContractStart);

  const [
    { data: activeBalance },
    { data: afterLeaveRows },
    activeAdjustments,
  ] = await Promise.all([
    adminClient
      .from("leave_balances")
      .select(
        "id, contract_year_start, contract_year_end, total_accrued, total_used",
      )
      .eq("profile_id", profileId)
      .eq("status", "active")
      .maybeSingle(),
    adminClient
      .from("attendance_records")
      .select("leave_deducted")
      .eq("profile_id", profileId)
      .eq("org_id", orgId)
      .gte("date", afterWindow.start)
      .lte("date", afterWindow.end),
    sumActiveLeaveAdjustments(adminClient, profileId),
  ]);

  const afterUsed = (afterLeaveRows ?? []).reduce(
    (sum, row) => sum + Number(row.leave_deducted ?? 0),
    0,
  );
  // Manual adjustments on the active year carry over to the new window.
  const afterAccrued =
    computeAccruedForWindow(afterWindow.start, afterWindow.end) +
    (activeBalance ? activeAdjustments : 0);

  let before: ContractStartSnapshot | null = null;
  if (activeBalance) {
    before = {
      windowStart: activeBalance.contract_year_start,
      windowEnd: activeBalance.contract_year_end,
      accrued: Number(activeBalance.total_accrued),
      used: Number(activeBalance.total_used),
      remaining: ledgerRemaining(
        Number(activeBalance.total_accrued),
        Number(activeBalance.total_used),
      ),
    };
  } else {
    const currentWindow = contractYearWindow(currentContractStart);
    const currentAccrued = computeAccruedForWindow(
      currentWindow.start,
      currentWindow.end,
    );
    before = {
      windowStart: currentWindow.start,
      windowEnd: currentWindow.end,
      accrued: currentAccrued,
      used: 0,
      remaining: currentAccrued,
    };
  }

  return {
    contractStart: nextContractStart,
    before,
    after: {
      windowStart: afterWindow.start,
      windowEnd: afterWindow.end,
      accrued: afterAccrued,
      used: afterUsed,
      remaining: ledgerRemaining(afterAccrued, afterUsed),
    },
  };
}

export async function previewContractStartChangeAction(
  profileId: string,
  yyyyMm: string,
): Promise<
  | { success: true; preview: ContractStartPreview }
  | { success: false; error: string }
> {
  await requireAdminUser();
  const actor = await getCurrentProfile();
  if (!actor?.organization_id) {
    return { success: false, error: "Not authorized." };
  }

  let nextContractStart: string;
  try {
    nextContractStart = toContractStartFirst(yyyyMm);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid contract start.",
    };
  }

  const adminClient = createAdminClient();
  const { data: target, error } = await adminClient
    .from("profiles")
    .select("id, organization_id, contract_start")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }
  if (!target || target.organization_id !== actor.organization_id) {
    return { success: false, error: "Employee not found in your organization." };
  }

  const preview = await loadContractStartPreview(
    adminClient,
    profileId,
    actor.organization_id,
    target.contract_start ?? nextContractStart,
    nextContractStart,
  );
  return { success: true, preview };
}

export async function updateContractStartAction(
  profileId: string,
  yyyyMm: string,
): Promise<AttendanceActionResult> {
  await requireAdminUser();
  const actor = await getCurrentProfile();
  if (!actor?.organization_id) {
    return { success: false, error: "Not authorized." };
  }

  let nextContractStart: string;
  try {
    nextContractStart = toContractStartFirst(yyyyMm);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid contract start.",
    };
  }

  const adminClient = createAdminClient();
  const { data: target, error: targetError } = await adminClient
    .from("profiles")
    .select("id, organization_id, full_name, contract_start")
    .eq("id", profileId)
    .maybeSingle();

  if (targetError) {
    return { success: false, error: targetError.message };
  }
  if (!target || target.organization_id !== actor.organization_id) {
    return { success: false, error: "Employee not found in your organization." };
  }

  const previousStart = target.contract_start;
  const afterWindow = contractYearWindow(nextContractStart);

  const [
    { error: profileUpdateError },
    { data: activeBalance },
    { data: leaveRows },
    activeAdjustments,
  ] = await Promise.all([
    adminClient
      .from("profiles")
      .update({ contract_start: nextContractStart })
      .eq("id", profileId)
      .eq("organization_id", actor.organization_id),
    adminClient
      .from("leave_balances")
      .select("id")
      .eq("profile_id", profileId)
      .eq("status", "active")
      .maybeSingle(),
    adminClient
      .from("attendance_records")
      .select("leave_deducted")
      .eq("profile_id", profileId)
      .eq("org_id", actor.organization_id)
      .gte("date", afterWindow.start)
      .lte("date", afterWindow.end),
    sumActiveLeaveAdjustments(adminClient, profileId),
  ]);

  // Manual adjustments on the active year carry over to the new window.
  const afterAccrued =
    computeAccruedForWindow(afterWindow.start, afterWindow.end) +
    activeAdjustments;

  if (profileUpdateError) {
    return { success: false, error: profileUpdateError.message };
  }

  if (activeBalance) {
    const afterUsed = (leaveRows ?? []).reduce(
      (sum, row) => sum + Number(row.leave_deducted ?? 0),
      0,
    );
    const { error: balanceError } = await adminClient
      .from("leave_balances")
      .update({
        contract_year_start: afterWindow.start,
        contract_year_end: afterWindow.end,
        total_accrued: afterAccrued,
        total_used: afterUsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeBalance.id);

    if (balanceError) {
      return { success: false, error: balanceError.message };
    }
  }

  try {
    const { actorName } = await getActorLogContext(actor.id);
    void logActivity({
      orgId: actor.organization_id,
      eventType: "employee_edited",
      actorId: actor.id,
      actorName: actorName ?? undefined,
      targetId: profileId,
      targetName: target.full_name ?? undefined,
      entityType: "profile",
      entityId: profileId,
      metadata: {
        field: "contract_start",
        previous: previousStart,
        next: nextContractStart,
      },
    });
  } catch (logError) {
    console.error("[activity-log] Failed to log contract start change:", logError);
  }

  revalidatePath(`/employees/${profileId}`);
  revalidatePath("/attendance");
  return { success: true };
}
