"use server";

import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getEmployeeAttendance } from "@/lib/supabase/queries/attendance";
import { parseYearMonth } from "@/lib/helpers/dates";
import type { AttendanceRecord } from "@/types/attendance";

/** One month of someone's attendance, for the calendar on their profile. Owners and admins. */
export async function loadEmployeeMonth(
  profileId: string,
  yearMonth: string,
): Promise<{ success: true; records: AttendanceRecord[] } | { success: false; error: string }> {
  await requireAdminUser();
  const month = parseYearMonth(yearMonth);
  if (!month) return { success: false, error: "Choose a month." };
  return { success: true, records: await getEmployeeAttendance(profileId, month) };
}
