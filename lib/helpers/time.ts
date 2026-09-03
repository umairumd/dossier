export function formatLocalDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatLocalTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const AVERAGE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

// Averages the time-of-day (UTC, not calendar date) across a set of
// timestamps — used for "average submission time" on both the manager
// dashboard (today's submissions) and an employee's overview (trailing
// window). Returns null for an empty set rather than a misleading 12:00 AM.
export function averageSubmissionTime(timestamps: string[]): string | null {
  if (timestamps.length === 0) {
    return null;
  }

  const totalSeconds = timestamps.reduce((sum, timestamp) => {
    const date = new Date(timestamp);
    return (
      sum +
      date.getUTCHours() * 3600 +
      date.getUTCMinutes() * 60 +
      date.getUTCSeconds()
    );
  }, 0);

  const averageSeconds = Math.round(totalSeconds / timestamps.length);
  const hours = Math.floor(averageSeconds / 3600) % 24;
  const minutes = Math.floor((averageSeconds % 3600) / 60);

  return AVERAGE_TIME_FORMATTER.format(Date.UTC(2000, 0, 1, hours, minutes));
}

export function formatDeadlineHint(
  hourLocal: number,
  timezone: string,
): string {
  const period = hourLocal >= 12 ? "PM" : "AM";
  const hour12 = hourLocal % 12 || 12;
  const time = `Due by ${hour12}:00 ${period}`;

  const abbr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;

  if (
    !abbr ||
    abbr.includes("/") ||
    /^(GMT|UTC)[+-]/.test(abbr) ||
    abbr.startsWith("GMT")
  ) {
    return time;
  }

  return `${time} ${abbr}`;
}
