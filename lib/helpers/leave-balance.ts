import type { SupabaseClient } from "@supabase/supabase-js";

export function computeInitialLeaveBalance(joinDate: string): {
  contractYearStart: string;
  contractYearEnd: string;
  totalAccrued: number;
} {
  // Contract year starts on the 1st of the joining month. Built from UTC
  // parts: local-time Date + toISOString() shifts the date by the server's
  // UTC offset (e.g. "2026-09-01" became "2026-08-31" in UTC+5).
  const d = new Date(joinDate);
  const startYear = d.getUTCFullYear();
  const startMonth = d.getUTCMonth();
  const yearStart = new Date(Date.UTC(startYear, startMonth, 1));
  const yearEnd = new Date(Date.UTC(startYear + 1, startMonth, 0));

  const contractYearStart = yearStart.toISOString().slice(0, 10);
  const contractYearEnd = yearEnd.toISOString().slice(0, 10);

  // Accrue for months already passed in this contract year
  const now = new Date();
  const monthsElapsed = Math.max(
    1,
    (now.getUTCFullYear() - startYear) * 12 +
      now.getUTCMonth() -
      startMonth +
      1,
  );
  const totalAccrued = Math.min(monthsElapsed * 2, 24); // cap at 24

  return { contractYearStart, contractYearEnd, totalAccrued };
}

export async function insertLeaveBalanceRecord(
  client: SupabaseClient,
  profileId: string,
  orgId: string,
  joinDate: string,
): Promise<{ success: boolean; error?: string }> {
  const { contractYearStart, contractYearEnd, totalAccrued } =
    computeInitialLeaveBalance(joinDate);

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
