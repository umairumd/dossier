// A proper three-state submission status, replacing the old boolean
// isLateSubmission() helper that only ever answered "late or not,"
// leaving "no report yet" bucketed separately by every caller in its own
// way. Three states, one definition.
export type SubmissionStatus = "on_time" | "late" | "missed";

export const DEFAULT_REPORT_DEADLINE_HOUR_UTC = 17;

// Pure function — the deadline is a parameter, not a hardcoded constant,
// sourced from the organization_settings table (see
// lib/supabase/queries/organization-settings.ts). Evaluated in UTC (not
// the viewer's local time), so "late" means the same thing everywhere
// regardless of who's looking or where the server/browser runs.
export function getSubmissionStatus(
  submittedAt: string | null,
  deadlineHourUtc: number = DEFAULT_REPORT_DEADLINE_HOUR_UTC,
): SubmissionStatus {
  if (!submittedAt) {
    return "missed";
  }

  return new Date(submittedAt).getUTCHours() >= deadlineHourUtc
    ? "late"
    : "on_time";
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  on_time: "On Time",
  late: "Late",
  missed: "Missed",
};
