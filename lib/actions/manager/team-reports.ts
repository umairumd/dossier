"use server";

import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import type { TeamMemberReport } from "@/types/team";

export async function fetchTeamReportsForDate(
  date: string,
): Promise<TeamMemberReport[]> {
  return getTeamReportsForDate(date);
}
