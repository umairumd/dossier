"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimezone } from "@/lib/helpers/dates";
import { logActivity } from "@/lib/helpers/activity-log";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  getTodayReport,
  searchReports,
} from "@/lib/supabase/queries/reports";
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

type UpdateReportInput = {
  fieldResponses: Record<string, unknown>;
  content?: string;
  blockers?: string;
  additionalNotes?: string;
};

const UNIQUE_VIOLATION = "23505";
const ALREADY_SUBMITTED_ERROR = "You've already submitted a report for today.";

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
  const reportDate = todayInTimezone(settings.timezone);

  const { data: inserted, error } = await supabase
    .from("daily_reports")
    .insert({
      author_id: user.id,
      report_date: reportDate,
      content: input.content ?? "",
      blockers: input.blockers ?? "",
      additional_notes: input.additionalNotes ?? "",
      template_id: input.templateId,
      field_responses: input.fieldResponses,
    })
    .select("id")
    .single();

  if (error) {
    // The (author_id, report_date) unique constraint is the actual source
    // of truth for "one report per day" — this just turns that database
    // guarantee into a readable message instead of a generic failure.
    if (error.code === UNIQUE_VIOLATION) {
      return {
        success: false,
        error: ALREADY_SUBMITTED_ERROR,
      };
    }

    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }

  // Remote employees: auto-mark present for the report day.
  // Attendance is secondary — never fail the report submission.
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_remote, organization_id, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.organization_id) {
      void logActivity({
        orgId: profile.organization_id,
        eventType: "report_submitted",
        actorId: user.id,
        actorName: profile.full_name ?? undefined,
        targetId: user.id,
        targetName: profile.full_name ?? undefined,
        entityType: "report",
        entityId: inserted?.id,
        metadata: { reportDate },
      });
    }

    if (profile?.is_remote && profile.organization_id) {
      const adminClient = createAdminClient();
      // ignoreDuplicates: never overwrite an existing row (e.g. an
      // HR-recorded leave / half_leave / holiday) when a report is submitted.
      const { error: attendanceUpsertError } = await adminClient
        .from("attendance_records")
        .upsert(
          {
            profile_id: user.id,
            org_id: profile.organization_id,
            date: reportDate,
            status: "present",
            fine_amount: 0,
            leave_deducted: 0,
            source: "report",
            recorded_by: user.id,
          },
          { onConflict: "org_id,profile_id,date", ignoreDuplicates: true },
        );

      if (attendanceUpsertError) {
        console.error(
          "Failed to auto-record remote attendance:",
          attendanceUpsertError,
        );
      }
    }
  } catch (attendanceError) {
    console.error("Failed to auto-record remote attendance:", attendanceError);
  }

  revalidatePath("/");

  return { success: true };
}

export async function updateDailyReport(
  reportDate: string,
  input: UpdateReportInput,
): Promise<SubmitReportResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to update a report.",
    };
  }

  if (input.fieldResponses === undefined) {
    return { success: false, error: "No field responses provided." };
  }

  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);

  if (reportDate !== today) {
    return {
      success: false,
      error: "You can only edit today's report.",
    };
  }

  const { data: updated, error } = await supabase
    .from("daily_reports")
    .update({
      content: input.content ?? "",
      blockers: input.blockers ?? "",
      additional_notes: input.additionalNotes ?? "",
      field_responses: input.fieldResponses,
    })
    .eq("author_id", user.id)
    .eq("report_date", reportDate)
    .select("id");

  if (error) {
    return {
      success: false,
      error: "Couldn't update your report. Please try again.",
    };
  }

  if (!updated || updated.length === 0) {
    return {
      success: false,
      error: "No report found for today.",
    };
  }

  revalidatePath("/");
  revalidatePath("/reports");

  return { success: true };
}

export async function loadTodayReport(): Promise<DailyReport | null> {
  return getTodayReport();
}

export async function searchMyReports(query: string): Promise<DailyReport[]> {
  return searchReports(query);
}

export { ALREADY_SUBMITTED_ERROR };
