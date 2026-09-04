"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  validateReportInput,
  type ReportFieldErrors,
  type ReportFormInput,
} from "@/lib/validations/report";
import { searchReports } from "@/lib/supabase/queries/reports";
import type { DailyReport } from "@/types/report";

export interface SubmitReportResult {
  success: boolean;
  error?: string;
  fieldErrors?: ReportFieldErrors;
}

const UNIQUE_VIOLATION = "23505";

export async function submitDailyReport(
  input: ReportFormInput,
): Promise<SubmitReportResult> {
  const usingTemplate =
    Boolean(input.templateId) && input.fieldResponses !== undefined;

  let content = input.content ?? "";
  let blockers: string | null = input.blockers?.trim()
    ? input.blockers.trim()
    : null;
  let additionalNotes: string | null = input.additionalNotes?.trim()
    ? input.additionalNotes.trim()
    : null;

  if (!usingTemplate) {
    const validation = validateReportInput(input);

    if (!validation.valid) {
      return { success: false, fieldErrors: validation.fieldErrors };
    }

    content = validation.value.content;
    blockers = validation.value.blockers;
    additionalNotes = validation.value.additionalNotes;
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
    content: content ?? "",
    blockers,
    additional_notes: additionalNotes,
    template_id: input.templateId ?? null,
    field_responses: input.fieldResponses ?? null,
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
