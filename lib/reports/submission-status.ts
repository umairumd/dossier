// Submission status for daily reports. Null submissions are "pending" before
// the daily deadline and "missed" after — except historical report dates,
// which are never pending, and approved leave days, which are "on_leave".
import { todayInTimezone } from "@/lib/helpers/dates";
import type { AttendanceStatus } from "@/types/attendance";

export type SubmissionStatus =
  | "on_time"
  | "late"
  | "missed"
  | "pending"
  | "on_leave"
  | "holiday";

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
//
// reportDate: when provided and not equal to today in the org timezone
// (or UTC without ctx), a null submission is always "missed" — never
// "pending". Prevents past-day gaps from flipping to Pending before
// today's deadline.
//
// isOnLeave: when true (approved leave covering the report date), status
// is always "on_leave" — never missed/pending for that day.
// attendanceStatus: when "holiday", status is "holiday".
export function getSubmissionStatus(
  submittedAt: string | null,
  deadlineHourUtc: number = DEFAULT_REPORT_DEADLINE_HOUR_UTC,
  ctx?: DeadlineContext,
  reportDate?: string,
  isOnLeave?: boolean,
  attendanceStatus?: AttendanceStatus | null,
): SubmissionStatus {
  if (attendanceStatus === "holiday") return "holiday";
  if (isOnLeave) return "on_leave";

  if (!submittedAt) {
    if (reportDate) {
      const today = ctx
        ? todayInTimezone(ctx.timezone)
        : todayInTimezone("UTC");
      if (reportDate !== today) {
        return "missed";
      }
    }

    const hourNow = ctx
      ? localHourInTimezone(new Date().toISOString(), ctx.timezone)
      : new Date().getUTCHours();
    const deadlineHour = ctx ? ctx.deadlineHourLocal : deadlineHourUtc;
    return hourNow < deadlineHour ? "pending" : "missed";
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
  pending: "Pending",
  on_leave: "On Leave",
  holiday: "Holiday",
};
