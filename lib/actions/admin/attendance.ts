"use server";

import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertLeaveBalanceRecord } from "@/lib/helpers/leave-balance";
import {
  getActorLogContext,
  logActivity,
} from "@/lib/helpers/activity-log";
import { getReportByAuthorAndDate } from "@/lib/supabase/queries/reports";
import type { AttendanceStatus, ShiftType } from "@/types/attendance";
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
 * Applies a leave delta to BOTH ledgers:
 *  - profiles.leave_balance          -= delta
 *  - leave_balances.total_used (active row) += delta
 *
 * `delta` is days consumed; negative values refund. No floor is applied —
 * negative balances are intentional. If the second write fails, the first is
 * reversed so the ledgers never silently diverge.
 */
async function adjustLeaveLedgers(
  adminClient: AdminClient,
  profileId: string,
  delta: number,
): Promise<AttendanceActionResult> {
  if (delta === 0) {
    return { success: true };
  }

  const { data: profile, error: fetchError } = await adminClient
    .from("profiles")
    .select("leave_balance")
    .eq("id", profileId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!profile) {
    return { success: false, error: "Employee profile not found." };
  }

  const previousBalance = Number(profile.leave_balance);
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ leave_balance: previousBalance - delta })
    .eq("id", profileId);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const { data: ledger, error: ledgerFetchError } = await adminClient
    .from("leave_balances")
    .select("id, total_used")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  let ledgerError = ledgerFetchError;

  if (!ledgerError) {
    if (!ledger) {
      console.warn(
        `[leave] No active leave_balances row for ${profileId}; skipping total_used update.`,
      );
      return { success: true };
    }

    const { error: ledgerUpdateError } = await adminClient
      .from("leave_balances")
      .update({ total_used: Number(ledger.total_used) + delta })
      .eq("id", ledger.id);
    ledgerError = ledgerUpdateError;
  }

  if (ledgerError) {
    console.error(
      `[leave] Failed to update leave_balances.total_used for ${profileId}:`,
      ledgerError,
    );
    const { error: undoError } = await adminClient
      .from("profiles")
      .update({ leave_balance: previousBalance })
      .eq("id", profileId);

    if (undoError) {
      console.error(
        `[leave] LEDGER MISMATCH: could not restore profiles.leave_balance for ${profileId} (expected ${previousBalance}):`,
        undoError,
      );
    }
    return { success: false, error: ledgerError.message };
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

  const balanceResult = await adjustLeaveLedgers(
    createAdminClient(),
    record.profileId,
    record.leaveDeducted - oldLeaveDeducted,
  );
  if (!balanceResult.success) {
    return balanceResult;
  }

  try {
    const { actorName } = await getActorLogContext(admin.id);
    const adminClient = createAdminClient();
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

  const { data: eligible, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, leave_balance")
    .eq("is_active", true)
    .is("archived_at", null)
    .eq("exclude_from_attendance", false);

  if (profilesError) {
    return { success: false, count: 0, error: profilesError.message };
  }

  const { data: existingAccruals, error: existingError } = await adminClient
    .from("leave_accruals")
    .select("profile_id")
    .eq("year", year)
    .eq("month", month);

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

  const balanceByProfile = new Map(
    pending.map((profile) => [profile.id, Number(profile.leave_balance)]),
  );
  const creditedProfileIds: string[] = [];
  const failed: string[] = [];

  for (const { profile_id: profileId } of inserted ?? []) {
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ leave_balance: (balanceByProfile.get(profileId) ?? 0) + 2 })
      .eq("id", profileId);

    if (updateError) {
      failed.push(profileId);
      // Remove the claim so a retry picks this profile up again.
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
      continue;
    }

    creditedProfileIds.push(profileId);
  }

  const count = creditedProfileIds.length;

  if (count > 0) {
    const { data: balances, error: fetchError } = await adminClient
      .from("leave_balances")
      .select("id, total_accrued")
      .eq("status", "active")
      .in("profile_id", creditedProfileIds);

    if (fetchError) {
      console.error("[accrual] Failed to load leave_balances:", fetchError);
    }

    for (const balance of balances ?? []) {
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
        metadata: { count, year, month },
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log accrual run:", logError);
  }

  revalidatePath("/attendance");

  if (failed.length > 0) {
    return {
      success: false,
      count,
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
