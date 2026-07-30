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
// todayDateString() in lib/supabase/queries/reports.ts) instead of
// depending on the browser's local-timezone interpretation of a bare date
// string.
export function formatDate(dateString: string): string {
  return DATE_FORMATTER.format(new Date(`${dateString}T00:00:00Z`));
}

export function formatDateTime(isoString: string): string {
  return DATE_TIME_FORMATTER.format(new Date(isoString));
}
