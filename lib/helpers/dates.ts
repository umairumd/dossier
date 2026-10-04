const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatLongDate(date: Date): string {
  return LONG_DATE_FORMATTER.format(date);
}

// report_date is a plain "YYYY-MM-DD" date (no time/zone); forcing UTC
// parsing here keeps it consistent with how it's written (see
// todayDateString() below) instead of depending on the browser's
// local-timezone interpretation of a bare date string.
export function formatDate(dateString: string): string {
  return DATE_FORMATTER.format(new Date(`${dateString}T00:00:00Z`));
}

function daysSinceReportDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const submitted = new Date(`${dateStr}T00:00:00Z`);
  return Math.floor((today.getTime() - submitted.getTime()) / 86400000);
}

export function formatDaysAgoLong(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const days = daysSinceReportDate(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function formatDaysAgoShort(
  dateStr: string | null | undefined,
): string | null {
  if (!dateStr) return null;
  const days = daysSinceReportDate(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function formatShortLastReport(
  dateStr: string | null | undefined,
): { label: string; title?: string } {
  if (!dateStr) return { label: "—" };
  const diff = daysSinceReportDate(dateStr);
  const title = formatDate(dateStr);
  if (diff <= 0) return { label: "Today", title };
  if (diff < 7) return { label: `${diff}d`, title };
  const short = new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return { label: short, title };
}

export function formatDateTime(isoString: string): string {
  return DATE_TIME_FORMATTER.format(new Date(isoString));
}

// The single definition of "today" as a report_date-shaped string — was
// previously duplicated in lib/supabase/queries/reports.ts and
// lib/supabase/queries/team.ts.
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Whole-day difference between two report_date ("YYYY-MM-DD") strings,
// both parsed as UTC midnight for consistency with todayDateString().
export function daysBetweenDateStrings(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

// report_date-shaped string for "n days before today" — shared by every
// trend/insights query (manager and admin) that builds an N-day series.
export function dateNDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export function shiftReportDate(date: string, deltaDays: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + deltaDays);
  return next.toISOString().slice(0, 10);
}

export function todayInTimezone(tz: string): string {
  return dateInTimezone(new Date(), tz);
}

/**
 * Format an instant as YYYY-MM-DD in the given IANA timezone — same
 * Intl.DateTimeFormat("en-CA") path as todayInTimezone / getSubmissionStatus.
 */
export function dateInTimezone(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * UTC ISO bounds for one calendar day in an IANA timezone.
 * `startIso` is inclusive midnight; `endIso` is exclusive next midnight —
 * use with `.gte(startIso).lt(endIso)` on timestamptz columns.
 */
export function orgDayUtcBounds(
  dateYYYYMMDD: string,
  timeZone: string,
): { startIso: string; endIso: string } {
  const startMs = zonedMidnightUtcMs(dateYYYYMMDD, timeZone);
  const nextDay = shiftReportDate(dateYYYYMMDD, 1);
  const endMs = zonedMidnightUtcMs(nextDay, timeZone);
  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
  };
}

/** UTC ms of local 00:00:00 on `dateYYYYMMDD` in `timeZone`. */
function zonedMidnightUtcMs(dateYYYYMMDD: string, timeZone: string): number {
  const utcGuess = Date.parse(`${dateYYYYMMDD}T00:00:00.000Z`);
  // Search ±36h around UTC midnight to cover any offset / DST shift.
  let lo = utcGuess - 36 * 3_600_000;
  let hi = utcGuess + 36 * 3_600_000;

  // Earliest UTC instant whose calendar date in `timeZone` is dateYYYYMMDD.
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (dateInTimezone(new Date(mid), timeZone) < dateYYYYMMDD) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

export function isWorkingDay(
  dateString: string,
  workingDays: number[],
): boolean {
  const date = new Date(`${dateString}T00:00:00Z`);
  const utcDay = date.getUTCDay();
  const isoDay = utcDay === 0 ? 7 : utcDay;
  return workingDays.includes(isoDay);
}

export function lastNWorkingDays(
  n: number,
  workingDays: number[],
  tz: string,
): string[] {
  const result: string[] = [];
  const today = todayInTimezone(tz);
  let cursor = new Date(`${today}T00:00:00Z`);

  while (result.length < n) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (isWorkingDay(dateStr, workingDays)) {
      result.unshift(dateStr);
    }
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return result;
}

// "YYYY-MM" with a real month (01-12), or null. Used to sanitise ?month=
// search params before they reach Date math or queries.
export function parseYearMonth(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

// "YYYY-MM-DD" that is also a real calendar date (rejects 2026-02-31).
export function isValidDateString(value?: string | null): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

// Last calendar day of a "YYYY-MM" month as "YYYY-MM-DD". Built from UTC
// parts so it doesn't shift by the server's local offset (the old
// new Date(y, m, 0).toISOString() pattern returned the previous day in
// UTC+ timezones).
export function lastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
