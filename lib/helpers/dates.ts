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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
