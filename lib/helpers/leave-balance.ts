import type { SupabaseClient } from "@supabase/supabase-js";

/** Always the 1st of the month (YYYY-MM-DD). */
export function toContractStartFirst(yyyyMm: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim());
  if (!match) {
    throw new Error("Contract start must be YYYY-MM");
  }
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error("Contract start month must be 01–12");
  }
  return `${match[1]}-${match[2]}-01`;
}

/** First of the calendar month containing `isoDate`. */
export function firstOfMonthContaining(isoDate: string): string {
  const day = isoDate.slice(0, 10);
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date");
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export type ContractYearWindow = {
  start: string;
  end: string;
};

/**
 * Contract year containing `asOf` for a given anniversary (1st of month).
 * Window: [anniversary in year Y, day before next anniversary].
 */
export function contractYearWindow(
  contractStart: string,
  asOf: string = new Date().toISOString().slice(0, 10),
): ContractYearWindow {
  const startDay = firstOfMonthContaining(contractStart);
  const asOfDay = asOf.slice(0, 10);
  const annMonth = Number(startDay.slice(5, 7));

  const asOfDate = new Date(`${asOfDay}T12:00:00Z`);
  let year = asOfDate.getUTCFullYear();
  let start = new Date(Date.UTC(year, annMonth - 1, 1));
  if (asOfDate < start) {
    year -= 1;
    start = new Date(Date.UTC(year, annMonth - 1, 1));
  }
  const end = new Date(Date.UTC(year + 1, annMonth - 1, 0));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/** Inclusive calendar months from `from` to `to` (both YYYY-MM-DD). */
export function inclusiveMonthCount(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${to.slice(0, 10)}T12:00:00Z`);
  if (b < a) return 0;
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth()) +
    1
  );
}

/**
 * Expected accrued for a window: 2 days per inclusive month from window
 * start through min(today, window end), capped at 24.
 */
export function computeAccruedForWindow(
  windowStart: string,
  windowEnd: string,
  asOf: string = new Date().toISOString().slice(0, 10),
): number {
  const today = asOf.slice(0, 10);
  const through = today < windowEnd ? today : windowEnd;
  if (through < windowStart) return 0;
  return Math.min(24, inclusiveMonthCount(windowStart, through) * 2);
}

export function computeInitialLeaveBalance(contractStart: string): {
  contractYearStart: string;
  contractYearEnd: string;
  totalAccrued: number;
} {
  const start = firstOfMonthContaining(contractStart);
  const { start: contractYearStart, end: contractYearEnd } =
    contractYearWindow(start);
  const totalAccrued = computeAccruedForWindow(
    contractYearStart,
    contractYearEnd,
  );
  return { contractYearStart, contractYearEnd, totalAccrued };
}

export async function insertLeaveBalanceRecord(
  client: SupabaseClient,
  profileId: string,
  orgId: string,
  contractStart: string,
): Promise<{ success: boolean; error?: string }> {
  const { contractYearStart, contractYearEnd, totalAccrued } =
    computeInitialLeaveBalance(contractStart);

  // profiles.leave_balance is synced by the leave_balances trigger.
  const { error } = await client.from("leave_balances").insert({
    profile_id: profileId,
    org_id: orgId,
    contract_year_start: contractYearStart,
    contract_year_end: contractYearEnd,
    total_accrued: totalAccrued,
    total_used: 0,
    status: "active",
  });

  if (error) return { success: false, error: error.message };

  return { success: true };
}

/** Insert leave balance only if none exists yet (any status). */
export async function ensureLeaveBalanceRecord(
  client: SupabaseClient,
  profileId: string,
  orgId: string,
  contractStart: string,
): Promise<{ success: boolean; error?: string; created: boolean }> {
  const { data: existing, error: lookupError } = await client
    .from("leave_balances")
    .select("id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: lookupError.message, created: false };
  }

  if (existing) {
    return { success: true, created: false };
  }

  const result = await insertLeaveBalanceRecord(
    client,
    profileId,
    orgId,
    contractStart,
  );
  return { ...result, created: result.success };
}

/** Remaining days on the active ledger row (accrued − used). */
export function ledgerRemaining(
  totalAccrued: number,
  totalUsed: number,
): number {
  return Number(totalAccrued) - Number(totalUsed);
}

export type LeaveBarSegment =
  | "taken"
  | "available"
  | "removed"
  | "over"
  | "empty";

export type LeaveBarSquare = {
  left: LeaveBarSegment;
  right: LeaveBarSegment;
};

export type LeaveBalanceBarMath = {
  months: number;
  credited: number;
  adjustments: number;
  removed: number;
  added: number;
  taken: number;
  available: number;
  over: number;
  stillToCome: number;
  remaining: number;
  /** First of next calendar month when that date is in-window and credited < 24. */
  nextAccrualDate: string | null;
  yearEnd: string;
  /** 12 short month labels from contract year start. */
  monthLabels: string[];
  /** Index 0–11 of today's month in monthLabels, or -1 if outside the year. */
  currentMonthIndex: number;
  /** Short name of the calendar month after `asOf` (for borrowed legend). */
  nextMonthLabel: string;
  squares: LeaveBarSquare[];
};

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function firstOfNextMonth(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
}

function buildSquares(
  taken: number,
  available: number,
  removed: number,
  over: number,
): LeaveBarSquare[] {
  const squares: LeaveBarSquare[] = Array.from({ length: 24 }, () => ({
    left: "empty" as LeaveBarSegment,
    right: "empty" as LeaveBarSegment,
  }));

  const queue: { kind: LeaveBarSegment; halves: number }[] = [
    { kind: "taken", halves: Math.round(taken * 2) },
    { kind: "available", halves: Math.round(available * 2) },
    { kind: "removed", halves: Math.round(removed * 2) },
    { kind: "over", halves: Math.round(over * 2) },
  ];

  let cursor = 0;
  for (const { kind, halves } of queue) {
    let left = halves;
    while (left > 0 && cursor < 48) {
      const index = Math.floor(cursor / 2);
      if (cursor % 2 === 0) {
        squares[index].left = kind;
      } else {
        squares[index].right = kind;
      }
      cursor += 1;
      left -= 1;
    }
  }

  return squares;
}

/**
 * Bar + legend figures for an active leave year. Pure: only the ledger
 * row dates/totals and an as-of date (defaults to today UTC).
 */
export function computeLeaveBalanceBarMath(
  input: {
    contractYearStart: string;
    contractYearEnd: string;
    totalAccrued: number;
    totalUsed: number;
  },
  asOf: string = new Date().toISOString().slice(0, 10),
): LeaveBalanceBarMath {
  const start = input.contractYearStart.slice(0, 10);
  const end = input.contractYearEnd.slice(0, 10);
  const today = asOf.slice(0, 10);
  const through = today < end ? today : end;

  const months = Math.min(12, Math.max(0, inclusiveMonthCount(start, through)));
  const credited = Math.min(24, months * 2);
  const totalAccrued = Number(input.totalAccrued);
  const totalUsed = Number(input.totalUsed);
  const adjustments = totalAccrued - credited;
  const removed = Math.max(0, -adjustments);
  const added = Math.max(0, adjustments);
  const taken = Math.min(totalUsed, totalAccrued);
  const available = Math.max(0, totalAccrued - totalUsed);
  const over = Math.max(0, totalUsed - totalAccrued);
  const stillToCome = Math.max(0, 24 - credited);
  const remaining = totalAccrued - totalUsed;

  const nextAccrual = firstOfNextMonth(today);
  const nextAccrualDate =
    nextAccrual >= start && nextAccrual <= end && credited < 24
      ? nextAccrual
      : null;

  const startMonth = Number(start.slice(5, 7)) - 1;
  const startYear = Number(start.slice(0, 4));
  const monthLabels = Array.from({ length: 12 }, (_, i) => {
    const m = (startMonth + i) % 12;
    return SHORT_MONTHS[m];
  });

  const todayMonth = Number(today.slice(5, 7)) - 1;
  const todayYear = Number(today.slice(0, 4));
  let currentMonthIndex = -1;
  for (let i = 0; i < 12; i += 1) {
    const y = startYear + Math.floor((startMonth + i) / 12);
    const m = (startMonth + i) % 12;
    if (y === todayYear && m === todayMonth) {
      currentMonthIndex = i;
      break;
    }
  }

  const nextMonth = (todayMonth + 1) % 12;

  return {
    months,
    credited,
    adjustments,
    removed,
    added,
    taken,
    available,
    over,
    stillToCome,
    remaining,
    nextAccrualDate,
    yearEnd: end,
    monthLabels,
    currentMonthIndex,
    nextMonthLabel: SHORT_MONTHS[nextMonth],
    squares: buildSquares(taken, available, removed, over),
  };
}

/**
 * Batch-load active leave remaining. When `profileIds` is omitted, loads
 * every active row the caller can see (RLS). Pass ids when they are already
 * known so the query stays narrow.
 */
export async function loadActiveLeaveRemainingByProfile(
  client: SupabaseClient,
  profileIds?: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (profileIds && profileIds.length === 0) return map;

  let query = client
    .from("leave_balances")
    .select("profile_id, total_accrued, total_used")
    .eq("status", "active");

  if (profileIds) {
    query = query.in("profile_id", profileIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    map.set(
      row.profile_id,
      ledgerRemaining(Number(row.total_accrued), Number(row.total_used)),
    );
  }

  return map;
}
