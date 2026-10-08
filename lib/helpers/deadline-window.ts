/** Progress of the report deadline from the org shift start, not from midnight. */

export interface DeadlineWindow {
  /** 0 before the shift starts, 1 at and after the deadline. */
  fill: number;
  /** Last hour before the deadline, and everything after it. */
  amber: boolean;
  pastDue: boolean;
  /** Whole minutes until the deadline hour. 0 when past due. */
  minutesLeft: number;
}

function orgClock(now: Date, timeZone: string): { hour: number; minute: number } {
  let tz = timeZone;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return {
    hour: ((hour % 24) + 24) % 24,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function parseClockMinutes(value: string): number {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 9 * 60;
  return hour * 60 + minute;
}

export function deadlineWindow(
  now: Date,
  timeZone: string,
  shiftStart: string,
  deadlineHourLocal: number,
): DeadlineWindow {
  const { hour, minute } = orgClock(now, timeZone);
  const nowMinutes = hour * 60 + minute;
  const start = parseClockMinutes(shiftStart);
  // Hour 0 is the next midnight: the window runs to the end of the org day.
  const end = deadlineHourLocal === 0 ? 24 * 60 : deadlineHourLocal * 60;
  const lastHour = (deadlineHourLocal + 23) % 24;
  const inLastHour = hour === lastHour;
  const pastDue = !inLastHour && hour >= deadlineHourLocal;
  const minutesLeft = pastDue ? 0 : Math.max(0, end - nowMinutes);

  if (pastDue) {
    return { fill: 1, amber: true, pastDue: true, minutesLeft: 0 };
  }

  const span = end - start;
  if (span <= 0 || nowMinutes <= start) {
    return { fill: 0, amber: inLastHour, pastDue: false, minutesLeft };
  }

  const fill = Math.min(1, Math.max(0, (nowMinutes - start) / span));
  return { fill, amber: inLastHour, pastDue: false, minutesLeft };
}

export function formatDeadlineClock(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${period}`;
}

export function formatMinutesLeft(minutes: number): string {
  if (minutes <= 0) return "Past due";
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h left`;
  return `${hours}h ${rest}m left`;
}
