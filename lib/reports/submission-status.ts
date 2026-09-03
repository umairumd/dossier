// A proper three-state submission status, replacing the old boolean
// isLateSubmission() helper that only ever answered "late or not,"
// leaving "no report yet" bucketed separately by every caller in its own
// way. Three states, one definition.
export type SubmissionStatus = "on_time" | "late" | "missed";

export const DEFAULT_REPORT_DEADLINE_HOUR_UTC = 17;

export interface DeadlineContext {
  deadlineHourUtc: number;
  deadlineHourLocal: number;
  timezone: string;
  workingDays: number[];
}

function localHourInTimezone(isoString: string, timezone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(new Date(isoString))
    .find((part) => part.type === "hour")?.value;

  return parseInt(hour ?? "0", 10);
}

// Pure function — the deadline is a parameter, not a hardcoded constant,
// sourced from the organization_settings table. When ctx is provided,
// lateness is evaluated in the org timezone against the local deadline
// hour. Otherwise the UTC hour fallback is used.
export function getSubmissionStatus(
  submittedAt: string | null,
  deadlineHourUtc: number = DEFAULT_REPORT_DEADLINE_HOUR_UTC,
  ctx?: DeadlineContext,
): SubmissionStatus {
  if (!submittedAt) {
    return "missed";
  }

  if (ctx) {
    const hour = localHourInTimezone(submittedAt, ctx.timezone);
    return hour >= ctx.deadlineHourLocal ? "late" : "on_time";
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
