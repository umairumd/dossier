// A proper three-state submission status, replacing the old boolean
// isLateSubmission() helper that only ever answered "late or not,"
// leaving "no report yet" bucketed separately by every caller in its own
// way. Three states, one definition, one place the deadline lives.
export type SubmissionStatus = "on_time" | "late" | "missed";

// Placeholder for a future Organization Settings > Report Deadline field.
// No admin-configurable settings page exists yet — this constant is the
// single place that value lives, specifically so wiring up a real setting
// later means changing where this is read from, not hunting down every
// place a deadline hour was hardcoded. Evaluated in UTC (not the viewer's
// local time), so "late" means the same thing everywhere regardless of
// who's looking or where the server/browser runs — this is still a
// judgment-call default, not a discovered "correct" business hour, and
// should be revisited once a real organization deadline is configurable.
export const REPORT_DEADLINE_HOUR_UTC = 17;

export function getSubmissionStatus(
  submittedAt: string | null,
): SubmissionStatus {
  if (!submittedAt) {
    return "missed";
  }

  return new Date(submittedAt).getUTCHours() >= REPORT_DEADLINE_HOUR_UTC
    ? "late"
    : "on_time";
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  on_time: "On Time",
  late: "Late",
  missed: "Missed",
};
