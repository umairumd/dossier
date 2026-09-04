"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { searchReports } from "@/lib/supabase/queries/reports";
import type { DailyReport } from "@/types/report";

export interface SubmitReportResult {
  success: boolean;
  error?: string;
}

type SubmitReportInput = {
  templateId: string;
  fieldResponses: Record<string, unknown>;
  content?: string;
  blockers?: string;
  additionalNotes?: string;
};

const UNIQUE_VIOLATION = "23505";

export async function submitDailyReport(
  input: SubmitReportInput,
): Promise<SubmitReportResult> {
  if (!input.templateId || input.fieldResponses === undefined) {
    return { success: false, error: "No template provided." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to submit a report.",
    };
  }

  const settings = await getOrganizationSettings();

  const { error } = await supabase.from("daily_reports").insert({
    author_id: user.id,
    report_date: todayInTimezone(settings.timezone),
    content: input.content ?? "",
    blockers: input.blockers ?? "",
    additional_notes: input.additionalNotes ?? "",
    template_id: input.templateId,
    field_responses: input.fieldResponses,
  });

  if (error) {
    // The (author_id, report_date) unique constraint is the actual source
    // of truth for "one report per day" — this just turns that database
    // guarantee into a readable message instead of a generic failure.
    if (error.code === UNIQUE_VIOLATION) {
      return {
        success: false,
        error: "You've already submitted a report for today.",
      };
    }

    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/");

  return { success: true };
}

export async function searchMyReports(query: string): Promise<DailyReport[]> {
  return searchReports(query);
}
