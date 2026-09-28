"use server";

import {
  getDeptCompletionForDate,
  type DeptCompletionRow,
} from "@/lib/supabase/queries/admin/dept-completion";

export async function fetchDeptCompletion(
  date: string,
): Promise<DeptCompletionRow[]> {
  return getDeptCompletionForDate(date);
}
