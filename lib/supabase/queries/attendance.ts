import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { insertLeaveBalanceRecord } from "@/lib/helpers/leave-balance";
import type {
  AttendanceRecord,
  AttendanceRecordWithEmployee,
  AttendanceSettings,
  AttendanceStatus,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestWithEmployee,
  ShiftAssignment,
  ShiftType,
} from "@/types/attendance";

// ── Attendance settings ───────────────────────────────────────────

export const getAttendanceSettings = cache(
  async (): Promise<AttendanceSettings> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organization_settings")
      .select(
        "attendance_grace_minutes, fine_late_amount, fine_very_late_amount, fine_uninformed_amount, informed_leaves_per_month, shift_fulltime_start, shift_morning_start, shift_morning_end, shift_evening_start, shift_evening_end",
      )
      .eq("id", true)
      .maybeSingle();

    return {
      graceMinutes: data?.attendance_grace_minutes ?? 15,
      fineLateAmount: data?.fine_late_amount ?? 200,
      fineVeryLateAmount: data?.fine_very_late_amount ?? 300,
      fineUninformedAmount: data?.fine_uninformed_amount ?? 500,
      informedLeavesPerMonth: data?.informed_leaves_per_month ?? 2,
      shiftFulltimeStart: data?.shift_fulltime_start ?? "09:00:00",
      shiftMorningStart: data?.shift_morning_start ?? "09:00:00",
      shiftMorningEnd: data?.shift_morning_end ?? "13:00:00",
      shiftEveningStart: data?.shift_evening_start ?? "13:00:00",
      shiftEveningEnd: data?.shift_evening_end ?? "17:30:00",
    };
  },
);

// ── Shift assignments ─────────────────────────────────────────────

// Get the current active shift for a specific employee
export async function getCurrentShift(
  profileId: string,
): Promise<ShiftAssignment | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("shift_assignments")
    .select("*")
    .eq("profile_id", profileId)
    .lte("effective_from", today)
    .or("effective_to.is.null,effective_to.gte." + today)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as ShiftAssignment | null;
}

// Get all shift assignments for an employee (history)
export const getShiftHistory = cache(
  async (profileId: string): Promise<ShiftAssignment[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shift_assignments")
      .select("*")
      .eq("profile_id", profileId)
      .order("effective_from", { ascending: false });
    return (data as ShiftAssignment[]) ?? [];
  },
);

// Assign a shift to an employee (admin/manager only)
// Closes any currently open shift first
export async function assignShift(
  profileId: string,
  orgId: string,
  shiftType: ShiftType,
  effectiveFrom: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  // Close the current active shift if one exists
  const { error: closeError } = await supabase
    .from("shift_assignments")
    .update({ effective_to: effectiveFrom })
    .eq("profile_id", profileId)
    .is("effective_to", null)
    .lte("effective_from", today);

  if (closeError) {
    console.error("[assignShift] Failed to close existing shift:", closeError);
  }

  // Insert new shift
  const { error } = await supabase.from("shift_assignments").insert({
    profile_id: profileId,
    org_id: orgId,
    shift_type: shiftType,
    effective_from: effectiveFrom,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Attendance records ────────────────────────────────────────────

// Get all attendance records for a given month (YYYY-MM) for the org
// Used by HR to render the monthly grid
export const getMonthlyAttendance = cache(
  async (yearMonth: string): Promise<AttendanceRecordWithEmployee[]> => {
    await requireAdminUser();
    const supabase = await createClient();

    const startDate = `${yearMonth}-01`;
    const [year, month] = yearMonth.split("-").map(Number);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("attendance_records")
      .select(
        "*, profiles!attendance_records_profile_id_fkey(full_name, is_remote, employment_type)",
      )
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) throw new Error("Failed to load monthly attendance.");

    return (data ?? []).map((row: any) => ({
      ...row,
      full_name: row.profiles?.full_name ?? "",
      is_remote: row.profiles?.is_remote ?? false,
      employment_type: row.profiles?.employment_type ?? "full_time",
    }));
  },
);

// Team-scoped monthly attendance for managers/supervisors (RLS enforces visibility)
export const getTeamMonthlyAttendance = cache(
  async (
    yearMonth: string,
    profileIds: string[],
  ): Promise<AttendanceRecord[]> => {
    if (profileIds.length === 0) {
      return [];
    }

    const supabase = await createClient();
    const startDate = `${yearMonth}-01`;
    const [year, month] = yearMonth.split("-").map(Number);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .in("profile_id", profileIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) throw new Error("Failed to load team attendance.");

    return (data as AttendanceRecord[]) ?? [];
  },
);

// Get attendance records for a single employee
export const getEmployeeAttendance = cache(
  async (profileId: string, yearMonth: string): Promise<AttendanceRecord[]> => {
    const supabase = await createClient();
    const startDate = `${yearMonth}-01`;
    const [year, month] = yearMonth.split("-").map(Number);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("profile_id", profileId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    return (data as AttendanceRecord[]) ?? [];
  },
);

// Upsert a single attendance record (HR entry via the monthly grid popover)
export async function saveAttendanceRecord(record: {
  profileId: string;
  orgId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  fineAmount: number;
  leaveDeducted: number;
  notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
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
  return { success: true };
}

// ── Leave balances ────────────────────────────────────────────────

// Get the active leave balance for an employee
export const getActiveLeaveBalance = cache(
  async (profileId: string): Promise<LeaveBalance | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("profile_id", profileId)
      .eq("status", "active")
      .maybeSingle();

    if (!data) return null;
    return {
      ...(data as LeaveBalance),
      balance_remaining: Number(data.total_accrued) - Number(data.total_used),
    };
  },
);

// Get all leave balances for an employee (full history)
export const getLeaveBalanceHistory = cache(
  async (profileId: string): Promise<LeaveBalance[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("profile_id", profileId)
      .order("contract_year_start", { ascending: false });

    return ((data as LeaveBalance[]) ?? []).map((row) => ({
      ...row,
      balance_remaining: Number(row.total_accrued) - Number(row.total_used),
    }));
  },
);

// Initialize a leave balance for a new employee
// Called when an employee is first onboarded / HR initializes
export async function initLeaveBalance(
  profileId: string,
  orgId: string,
  joinDate: string, // YYYY-MM-DD
): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  const supabase = await createClient();
  return insertLeaveBalanceRecord(supabase, profileId, orgId, joinDate);
}

// ── Leave requests ────────────────────────────────────────────────

// Get all pending leave requests for the org (HR view)
export const getPendingLeaveRequests = cache(
  async (): Promise<LeaveRequestWithEmployee[]> => {
    await requireAdminUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("leave_requests")
      .select("*, profiles!leave_requests_profile_id_fkey(full_name)")
      .eq("status", "pending")
      .order("date", { ascending: true });

    if (error) throw new Error("Failed to load leave requests.");

    return (data ?? []).map((row: any) => ({
      ...row,
      full_name: row.profiles?.full_name ?? "",
    }));
  },
);

// Get leave requests for a single employee
export const getEmployeeLeaveRequests = cache(
  async (profileId: string): Promise<LeaveRequest[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("profile_id", profileId)
      .order("date", { ascending: false });
    return (data as LeaveRequest[]) ?? [];
  },
);

// Approve or reject a leave request
// On approval: creates attendance_records row + updates leave balance
export async function reviewLeaveRequest(
  requestId: string,
  action: "approved" | "rejected",
  adminNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  // Fetch the request first
  const { data: req, error: fetchError } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !req) {
    return { success: false, error: "Leave request not found." };
  }

  // Update the request status
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
    // Determine leave_deducted from type
    const leaveDeducted = req.type === "full_day" ? 1 : 0.5;

    // Create attendance record
    const { error: arError } = await supabase
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

    if (arError) return { success: false, error: arError.message };

    // Increment total_used on the active leave balance
    const { data: balance } = await supabase
      .from("leave_balances")
      .select("id, total_used")
      .eq("profile_id", req.profile_id)
      .eq("status", "active")
      .maybeSingle();

    if (balance) {
      await supabase
        .from("leave_balances")
        .update({
          total_used: Number(balance.total_used) + leaveDeducted,
        })
        .eq("id", balance.id);
    }
  }

  return { success: true };
}
