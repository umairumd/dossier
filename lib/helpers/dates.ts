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
