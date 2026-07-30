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
