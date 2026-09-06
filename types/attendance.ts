// Attendance system types — mirrors the DB enums and table shapes
// defined in migrations 015–019.

// ── Enums ─────────────────────────────────────────────────────────

export type ShiftType = "fulltime" | "morning" | "evening";

export type AttendanceStatus =
  | "present"
  | "late_minor"
  | "late_major"
  | "work_from_home"
  | "leave"
  | "half_leave"
  | "absent"
  | "weekly_off"
  | "holiday";

export type AttendanceSource = "manual" | "report" | "qr";

export type LeaveBalanceStatus = "active" | "encashed" | "expired";

export type LeaveRequestType = "full_day" | "half_day_am" | "half_day_pm";

export type LeaveRequestStatus = "pending" | "approved" | "rejected";

// ── Attendance config (from organization_settings) ────────────────

export interface AttendanceSettings {
  graceMinutes: number;
  fineLateAmount: number;
  fineVeryLateAmount: number;
  fineUninformedAmount: number;
  informedLeavesPerMonth: number;
  shiftFulltimeStart: string; // "HH:MM:SS"
  shiftMorningStart: string;
  shiftMorningEnd: string;
  shiftEveningStart: string;
  shiftEveningEnd: string;
}

// ── Shift assignments ─────────────────────────────────────────────

export interface ShiftAssignment {
  id: string;
  org_id: string;
  profile_id: string;
  shift_type: ShiftType;
  effective_from: string; // YYYY-MM-DD
  effective_to: string | null; // null = currently active
  created_by: string | null;
  created_at: string;
}

// ── Attendance records ────────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  org_id: string;
  profile_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  check_in_time: string | null; // "HH:MM:SS" in org local timezone
  fine_amount: number; // PKR, stored on save
  leave_deducted: number; // 0, 0.5, or 1
  source: AttendanceSource;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// AttendanceRecord joined with employee name for display in the grid
export interface AttendanceRecordWithEmployee extends AttendanceRecord {
  full_name: string;
  is_remote: boolean;
  employment_type: "full_time" | "part_time";
}

// ── Leave balances ────────────────────────────────────────────────

export interface LeaveBalance {
  id: string;
  org_id: string;
  profile_id: string;
  contract_year_start: string; // YYYY-MM-DD
  contract_year_end: string; // YYYY-MM-DD
  total_accrued: number;
  total_used: number;
  encashed_days: number;
  encashed_at: string | null;
  status: LeaveBalanceStatus;
  created_at: string;
  updated_at: string;
  // Derived — not stored in DB
  balance_remaining?: number;
}

// ── Leave requests ────────────────────────────────────────────────

export interface LeaveRequest {
  id: string;
  org_id: string;
  profile_id: string;
  date: string; // YYYY-MM-DD
  type: LeaveRequestType;
  informed: boolean;
  status: LeaveRequestStatus;
  notes: string | null;
  admin_notes: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// LeaveRequest joined with employee name for HR view
export interface LeaveRequestWithEmployee extends LeaveRequest {
  full_name: string;
}

// ── Display helpers ───────────────────────────────────────────────

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  late_minor: "Late",
  late_major: "Very Late",
  work_from_home: "WFH",
  leave: "Leave",
  half_leave: "Half Leave",
  absent: "Absent",
  weekly_off: "Off",
  holiday: "Holiday",
};

// Short codes for the monthly grid cells (matches the spreadsheet)
export const ATTENDANCE_STATUS_SHORT: Record<AttendanceStatus, string> = {
  present: "P",
  late_minor: "L",
  late_major: "LL",
  work_from_home: "WH",
  leave: "LEV",
  half_leave: "H.L",
  absent: "A",
  weekly_off: "OFF",
  holiday: "HOL",
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  fulltime: "Full Time",
  morning: "Morning Shift",
  evening: "Evening Shift",
};

export const LEAVE_REQUEST_TYPE_LABELS: Record<LeaveRequestType, string> = {
  full_day: "Full Day",
  half_day_am: "Half Day (Morning)",
  half_day_pm: "Half Day (Afternoon)",
};

// How many days each leave type deducts from the bank
export const LEAVE_TYPE_DEDUCTION: Record<LeaveRequestType, number> = {
  full_day: 1,
  half_day_am: 0.5,
  half_day_pm: 0.5,
};
