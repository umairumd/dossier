// Employee record export: turns one person's raw records for a period into
// the figures, day rows and plain-language facts the PDF prints. Pure, so
// the dialog preview and the file always agree.
import { isWorkingDay } from "@/lib/helpers/dates";
import { fieldResponse } from "@/lib/reports/field-response";
import type { AttendanceStatus, ShiftType } from "@/types/attendance";
import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields, TemplateField } from "@/types/template";

export const RECORD_MAX_DAYS = 184; // about six months

export type RecordSections = {
  attendance: boolean;
  reports: boolean;
  comments: boolean;
};

export type RecordOptions = {
  showMissed: boolean;
  leaveAndFines: boolean;
  reviewPage: boolean;
};

export interface RecordAttendanceRow {
  date: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  fine_amount: number | null;
  leave_deducted: number | null;
  notes: string | null;
  holiday_name: string | null;
}

export interface RecordComment {
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface RecordRaw {
  person: {
    id: string;
    name: string;
    designation: string | null;
    departments: string[];
    managerName: string | null;
    joinedOn: string; // YYYY-MM-DD
    leaveBalanceNow: number;
  };
  orgName: string | null;
  timezone: string;
  workingDays: number[];
  deadlineHourLocal: number;
  today: string;
  /** "HH:MM:SS" shift starts from organisation settings. */
  shiftStarts: Record<ShiftType, string>;
  shifts: { shift_type: ShiftType; effective_from: string; effective_to: string | null }[];
  attendance: RecordAttendanceRow[];
  reports: DailyReport[];
  templates: ReportTemplateWithFields[];
  comments: Record<string, RecordComment[]>;
  accruals: { year: number; month: number; credited: number }[];
  adjustments: { adjustment: number; created_at: string }[];
}

export type Tone = "ok" | "warn" | "danger" | "leave" | "off" | "info" | "wfh" | "muted";

export type ReportDayStatus = "on_time" | "late" | "missed" | "leave" | "off" | "pending";

export type Answer =
  | { kind: "text"; label: string; lines: string[] }
  | { kind: "fact"; label: string; value: string }
  | { kind: "link"; label: string; href: string; text: string };

export interface RecordDay {
  date: string;
  weekday: string; // "Mon"
  dayOfMonth: number;
  working: boolean;
  attendance: {
    status: AttendanceStatus | null;
    label: string;
    tone: Tone;
    checkIn: string | null; // "9:41"
    lateMinutes: number | null;
    fine: number;
    note: string | null;
  };
  reportStatus: ReportDayStatus;
  report: {
    id: string;
    sentAt: string; // "5:20 PM"
    templateName: string | null;
    answers: Answer[];
    comments: RecordComment[];
  } | null;
}

export interface RecordWeek {
  label: string;
  expected: number;
  onTime: number;
  late: number;
  missed: number;
  leave: number;
}

export interface Highlight {
  tone: "danger" | "warn" | "ok" | "info";
  text: string;
}

export interface EmployeeRecord {
  person: RecordRaw["person"];
  orgName: string | null;
  period: { from: string; to: string; label: string; asOf: string | null };
  deadlineLabel: string;
  shiftLabel: string;
  days: RecordDay[];
  months: { key: string; label: string; days: RecordDay[] }[];
  weeks: RecordWeek[];
  summary: {
    expected: number;
    submitted: number;
    submittedOnExpected: number;
    rate: number;
    onTime: number;
    late: number;
    missed: number;
    onTimeRate: number;
    usualTime: string | null;
    longestStreak: { days: number; from: string; to: string } | null;
    attendance: {
      present: number;
      late: number;
      absent: number;
      leave: number;
      halfLeave: number;
      wfh: number;
      holiday: number;
      off: number;
      unmarked: number;
    };
    fines: number;
    leave: { taken: number; credited: number; adjusted: number; balanceNow: number };
    comments: number;
    commentedReports: number;
    repliedReports: number;
  };
  highlights: Highlight[];
}

// ── Dates ────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function utc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, delta: number): string {
  return new Date(utc(date).getTime() + delta * DAY_MS).toISOString().slice(0, 10);
}

export function daySpan(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / DAY_MS) + 1;
}

function dayParts(date: string) {
  const d = utc(date);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), w: d.getUTCDay() };
}

/** "Mon 1 Sep" (year added when it isn't the period's year). */
export function shortDate(date: string, withYear = false): string {
  const p = dayParts(date);
  return `${WEEKDAYS[p.w]} ${p.d} ${MONTHS[p.m]}${withYear ? ` ${p.y}` : ""}`;
}

/** "1 Sep 2026" */
export function plainDate(date: string): string {
  const p = dayParts(date);
  return `${p.d} ${MONTHS[p.m]} ${p.y}`;
}

/** "September 2026" for a whole calendar month, else "1 Aug to 15 Sep 2026". */
export function periodLabel(from: string, to: string): string {
  const a = dayParts(from);
  const b = dayParts(to);
  const monthEnd = addDays(addDays(`${to.slice(0, 7)}-01`, 32).slice(0, 7) + "-01", -1);
  if (a.y === b.y && a.m === b.m && a.d === 1 && to === monthEnd) {
    return `${MONTHS_LONG[a.m]} ${a.y}`;
  }
  if (a.y === b.y) {
    return `${a.d} ${MONTHS[a.m]} to ${b.d} ${MONTHS[b.m]} ${b.y}`;
  }
  return `${plainDate(from)} to ${plainDate(to)}`;
}

function hourLabel(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  return `${h}:00 ${hour < 12 ? "AM" : "PM"}`;
}

function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function localClock(iso: string, timeZone: string): { minutes: number; label: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { minutes: hour * 60 + minute, hour, label: clockLabel(`${hour}:${minute}`) };
}

function localDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function minutesOf(hhmmss: string): number {
  const [h, m] = hhmmss.split(":").map(Number);
  return h * 60 + (m || 0);
}

function listDates(dates: string[], max = 5): string {
  const shown = dates.slice(0, max).map((d) => shortDate(d));
  const rest = dates.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} and ${rest} more`;
  if (shown.length <= 1) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ── Attendance and answers ───────────────────────────────────────

const ATTENDANCE_LABEL: Record<AttendanceStatus, { label: string; tone: Tone }> = {
  present: { label: "Present", tone: "ok" },
  late_minor: { label: "Late", tone: "warn" },
  late_major: { label: "Very late", tone: "warn" },
  work_from_home: { label: "Work from home", tone: "wfh" },
  leave: { label: "Leave", tone: "leave" },
  half_leave: { label: "Half day leave", tone: "leave" },
  absent: { label: "Absent", tone: "danger" },
  weekly_off: { label: "Day off", tone: "off" },
  holiday: { label: "Holiday", tone: "off" },
};

const EXEMPT: ReadonlySet<AttendanceStatus> = new Set(["leave", "half_leave", "holiday", "weekly_off"]);
const STREAK_BREAK: ReadonlySet<AttendanceStatus> = new Set(["absent", "late_major"]);

function isAnswered(type: TemplateField["fieldType"], value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (type === "checkbox") return typeof value === "boolean";
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value.trim() : String(value);
}

/** A long link reads as its site and first path part on paper. */
function shortenLinks(text: string): string {
  return text.replace(/https?:\/\/[^\s)]+/g, (url) => {
    if (url.length <= 48) return url;
    try {
      const u = new URL(url);
      const first = u.pathname.split("/").filter(Boolean)[0];
      return `${u.hostname.replace(/^www\./, "")}${first ? `/${first}` : ""}/…`;
    } catch {
      return `${url.slice(0, 45)}…`;
    }
  });
}

/** Splits a written answer into lines; list markers are dropped (the PDF adds its own). */
function toLines(text: string): string[] {
  return shortenLinks(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, "").trim())
    // Very long unbroken words get break points so they wrap on the page.
    .map((line) => line.replace(/\S{32,}/g, (word) => word.replace(/(.{24})/g, "$1\u200B")))
    .filter(Boolean);
}

function humanise(key: string): string {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function answersFor(report: DailyReport, template: ReportTemplateWithFields | undefined): Answer[] {
  const out: Answer[] = [];
  const push = (label: string, type: TemplateField["fieldType"], value: unknown, unit?: string | null) => {
    if (!isAnswered(type, value)) return;
    if (type === "checkbox") {
      out.push({ kind: "fact", label, value: value ? "Yes" : "No" });
    } else if (type === "url") {
      out.push({ kind: "link", label, href: asText(value), text: shortenLinks(asText(value)) });
    } else if (type === "textarea" || (type === "text" && asText(value).length > 60)) {
      out.push({ kind: "text", label, lines: toLines(asText(value)) });
    } else {
      out.push({ kind: "fact", label, value: `${asText(value)}${unit ? ` ${unit}` : ""}` });
    }
  };

  if (template && report.field_responses) {
    for (const field of [...template.fields].sort((a, b) => a.fieldOrder - b.fieldOrder)) {
      push(field.label, field.fieldType, fieldResponse(report.field_responses, field), field.unit);
    }
  } else if (report.field_responses) {
    for (const [key, value] of Object.entries(report.field_responses)) {
      const type = typeof value === "number" ? "number" : typeof value === "boolean" ? "checkbox" : "textarea";
      push(humanise(key), type, value);
    }
  } else {
    push("Update", "textarea", report.content);
    push("Blockers", "textarea", report.blockers);
    push("Notes", "textarea", report.additional_notes);
  }
  return out;
}

// ── Build ────────────────────────────────────────────────────────

export function buildEmployeeRecord(raw: RecordRaw, from: string, to: string): EmployeeRecord {
  const tz = raw.timezone;
  const start = from;
  const end = to > raw.today ? raw.today : to;
  const asOf = to > raw.today ? raw.today : null;

  const attendanceByDate = new Map(raw.attendance.map((row) => [row.date, row]));
  const reportsByDate = new Map<string, DailyReport>();
  for (const report of raw.reports) {
    const existing = reportsByDate.get(report.report_date);
    if (!existing || report.submitted_at < existing.submitted_at) {
      reportsByDate.set(report.report_date, report);
    }
  }
  const templatesById = new Map(raw.templates.map((t) => [t.id, t]));
  const defaultTemplate = raw.templates.find((t) => t.isDefault);

  const shiftFor = (date: string): ShiftType => {
    const match = raw.shifts
      .filter((s) => s.effective_from <= date && (!s.effective_to || s.effective_to >= date))
      .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0];
    return match?.shift_type ?? "fulltime";
  };

  const nowLocalHour = localClock(new Date().toISOString(), tz).hour;
  const days: RecordDay[] = [];

  for (let date = start; date <= end; date = addDays(date, 1)) {
    const p = dayParts(date);
    const working = raw.workingDays.length === 0 || isWorkingDay(date, raw.workingDays);
    const row = attendanceByDate.get(date) ?? null;
    const status = row?.status ?? null;
    const meta = status ? ATTENDANCE_LABEL[status] : null;

    let lateMinutes: number | null = null;
    const checkIn = row?.check_in_time ? row.check_in_time.slice(0, 5).replace(/^0/, "") : null;
    if (checkIn && (status === "late_minor" || status === "late_major")) {
      const diff = minutesOf(checkIn) - minutesOf(raw.shiftStarts[shiftFor(date)]);
      lateMinutes = diff > 0 ? diff : null;
    }

    const report = reportsByDate.get(date) ?? null;
    const isLeave = status === "leave" || status === "half_leave";
    const isOff = !working || status === "weekly_off" || status === "holiday";

    let reportStatus: ReportDayStatus;
    // Sent on a later day (after midnight) counts as late, whatever the hour.
    const sentOn = report ? localDate(report.submitted_at, tz) : null;
    if (report) {
      reportStatus =
        sentOn! > date || localClock(report.submitted_at, tz).hour >= raw.deadlineHourLocal
          ? "late"
          : "on_time";
    } else if (isLeave) {
      reportStatus = "leave";
    } else if (isOff) {
      reportStatus = "off";
    } else if (date === raw.today && nowLocalHour < raw.deadlineHourLocal) {
      reportStatus = "pending";
    } else {
      reportStatus = "missed";
    }

    const template =
      (report?.template_id ? templatesById.get(report.template_id) : undefined) ??
      (report?.field_responses ? defaultTemplate : undefined);

    days.push({
      date,
      weekday: WEEKDAYS[p.w],
      dayOfMonth: p.d,
      working,
      attendance: {
        status,
        label: meta
          ? status === "holiday" && row?.holiday_name
            ? row.holiday_name
            : meta.label
          : working
            ? "Not marked"
            : "Day off",
        tone: meta ? meta.tone : working ? "muted" : "off",
        checkIn,
        lateMinutes,
        fine: Number(row?.fine_amount ?? 0),
        note: row?.notes?.trim() || null,
      },
      reportStatus,
      report: report
        ? {
            id: report.id,
            sentAt:
              sentOn && sentOn !== date
                ? `${localClock(report.submitted_at, tz).label}, ${dayParts(sentOn).d} ${MONTHS[dayParts(sentOn).m]}`
                : localClock(report.submitted_at, tz).label,
            templateName: template?.name ?? null,
            answers: answersFor(report, template),
            comments: raw.comments[report.id] ?? [],
          }
        : null,
    });
  }

  // Months for calendars and attendance pages.
  const months: EmployeeRecord["months"] = [];
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const last = months.at(-1);
    if (last && last.key === key) last.days.push(day);
    else {
      const p = dayParts(day.date);
      months.push({ key, label: `${MONTHS_LONG[p.m]} ${p.y}`, days: [day] });
    }
  }

  // Weeks, Monday to Sunday.
  const weeks: RecordWeek[] = [];
  let week: RecordWeek | null = null;
  let weekStart = "";
  let weekEnd = "";
  const closeWeek = () => {
    if (!week) return;
    const a = dayParts(weekStart);
    const b = dayParts(weekEnd);
    week.label =
      a.m === b.m
        ? a.d === b.d
          ? `${a.d} ${MONTHS[a.m]}`
          : `${a.d} to ${b.d} ${MONTHS[b.m]}`
        : `${a.d} ${MONTHS[a.m]} to ${b.d} ${MONTHS[b.m]}`;
    weeks.push(week);
  };
  for (const day of days) {
    if (!week || day.weekday === "Mon") {
      closeWeek();
      week = { label: "", expected: 0, onTime: 0, late: 0, missed: 0, leave: 0 };
      weekStart = day.date;
    }
    weekEnd = day.date;
    if (day.reportStatus === "on_time") week.onTime += 1;
    if (day.reportStatus === "late") week.late += 1;
    if (day.reportStatus === "missed") week.missed += 1;
    if (day.reportStatus === "leave") week.leave += 1;
    if (day.working && day.reportStatus !== "off" && day.reportStatus !== "leave") week.expected += 1;
  }
  closeWeek();

  // Summary.
  const expectedDays = days.filter(
    (d) => d.working && !(d.attendance.status && EXEMPT.has(d.attendance.status)) && d.reportStatus !== "pending",
  );
  const submittedDays = days.filter((d) => d.report);
  const submittedOnExpected = expectedDays.filter((d) => d.report).length;
  const onTime = submittedDays.filter((d) => d.reportStatus === "on_time").length;
  const late = submittedDays.filter((d) => d.reportStatus === "late").length;
  const missedDays = days.filter((d) => d.reportStatus === "missed");

  let usualTime: string | null = null;
  if (submittedDays.length > 0) {
    const reports = submittedDays.map((d) => reportsByDate.get(d.date)!);
    const avg = Math.round(
      reports.reduce((sum, r) => sum + localClock(r.submitted_at, tz).minutes, 0) / reports.length,
    );
    usualTime = clockLabel(`${Math.floor(avg / 60)}:${avg % 60}`);
  }

  // Longest streak, with the app's rules: leave and days off pass through,
  // a missed report, an absence or a very late arrival ends it.
  let best: { days: number; from: string; to: string } | null = null;
  let run = 0;
  let runFrom = "";
  let runTo = "";
  for (const day of days) {
    const s = day.attendance.status;
    const transparent =
      (s && EXEMPT.has(s)) || (!s && !day.working) || day.reportStatus === "pending";
    if (transparent) continue;
    if (s && STREAK_BREAK.has(s)) {
      run = 0;
      continue;
    }
    if (day.report) {
      if (run === 0) runFrom = day.date;
      run += 1;
      runTo = day.date;
      if (!best || run > best.days) best = { days: run, from: runFrom, to: runTo };
    } else if (day.reportStatus === "missed") {
      run = 0;
    }
  }

  const count = (statuses: AttendanceStatus[]) =>
    days.filter((d) => d.attendance.status && statuses.includes(d.attendance.status)).length;
  const attendance = {
    present: count(["present"]),
    late: count(["late_minor", "late_major"]),
    absent: count(["absent"]),
    leave: count(["leave"]),
    halfLeave: count(["half_leave"]),
    wfh: count(["work_from_home"]),
    holiday: count(["holiday"]),
    off: days.filter((d) => d.attendance.status === "weekly_off" || (!d.attendance.status && !d.working)).length,
    unmarked: days.filter((d) => !d.attendance.status && d.working && d.date < raw.today).length,
  };

  const fines = days.reduce((sum, d) => sum + d.attendance.fine, 0);
  const taken = raw.attendance
    .filter((row) => row.date >= start && row.date <= end)
    .reduce((sum, row) => sum + Number(row.leave_deducted ?? 0), 0);
  const credited = raw.accruals
    .filter((a) => {
      const key = `${a.year}-${String(a.month).padStart(2, "0")}`;
      return key >= start.slice(0, 7) && key <= end.slice(0, 7);
    })
    .reduce((sum, a) => sum + Number(a.credited ?? 0), 0);
  const adjusted = raw.adjustments
    .filter((a) => {
      const day = localDate(a.created_at, tz);
      return day >= start && day <= end;
    })
    .reduce((sum, a) => sum + Number(a.adjustment ?? 0), 0);

  const commented = submittedDays.filter((d) => (d.report?.comments.length ?? 0) > 0);
  const commentCount = commented.reduce((sum, d) => sum + d.report!.comments.length, 0);
  const replied = commented.filter((d) =>
    d.report!.comments.some((c) => c.authorId === raw.person.id),
  ).length;

  const summary: EmployeeRecord["summary"] = {
    expected: expectedDays.length,
    submitted: submittedDays.length,
    submittedOnExpected,
    rate: expectedDays.length === 0 ? 0 : Math.round((submittedOnExpected / expectedDays.length) * 100),
    onTime,
    late,
    missed: missedDays.length,
    onTimeRate: submittedDays.length === 0 ? 0 : Math.round((onTime / submittedDays.length) * 100),
    usualTime,
    longestStreak: best,
    attendance,
    fines,
    leave: { taken, credited, adjusted, balanceNow: raw.person.leaveBalanceNow },
    comments: commentCount,
    commentedReports: commented.length,
    repliedReports: replied,
  };

  // Plain facts worth raising in a review. No scores or judgements.
  const highlights: Highlight[] = [];
  const first = raw.person.name.split(" ")[0];
  if (missedDays.length > 0) {
    const absentToo = missedDays.filter((d) => d.attendance.status === "absent").length;
    highlights.push({
      tone: "danger",
      text: `${plural(missedDays.length, "report")} missed: ${listDates(missedDays.map((d) => d.date))}.${
        absentToo > 0 ? ` ${absentToo === missedDays.length ? (absentToo === 1 ? "It was" : "All were") : `${absentToo} of them were`} also ${absentToo === 1 ? "an absence" : "absences"}.` : ""
      }`,
    });
  }
  const lateDays = submittedDays.filter((d) => d.reportStatus === "late");
  if (lateDays.length > 0) {
    const byWeekday = new Map<string, number>();
    for (const d of lateDays) byWeekday.set(d.weekday, (byWeekday.get(d.weekday) ?? 0) + 1);
    const [topDay, topCount] = [...byWeekday.entries()].sort((a, b) => b[1] - a[1])[0];
    const pattern =
      lateDays.length >= 3 && topCount >= 2 && topCount / lateDays.length >= 0.5
        ? ` ${topCount} of them on a ${({ Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" } as Record<string, string>)[topDay]}.`
        : "";
    highlights.push({
      tone: "warn",
      text: `${plural(lateDays.length, "report")} sent after the ${hourLabel(raw.deadlineHourLocal)} deadline: ${listDates(lateDays.map((d) => d.date), 4)}.${pattern}`,
    });
  }
  const lateArrivals = days.filter((d) => d.attendance.status === "late_minor" || d.attendance.status === "late_major");
  if (lateArrivals.length > 0) {
    const shown = lateArrivals.slice(0, 4).map((d) =>
      d.attendance.lateMinutes ? `${shortDate(d.date)} (${d.attendance.lateMinutes} min)` : shortDate(d.date),
    );
    const rest = lateArrivals.length - shown.length;
    highlights.push({
      tone: "warn",
      text: `Late ${lateArrivals.length === 1 ? "once" : lateArrivals.length === 2 ? "twice" : `${lateArrivals.length} times`}: ${shown.join(", ")}${rest > 0 ? ` and ${rest} more` : ""}.`,
    });
  }
  const absences = days.filter((d) => d.attendance.status === "absent" && d.reportStatus !== "missed");
  if (absences.length > 0) {
    highlights.push({ tone: "danger", text: `Absent on ${listDates(absences.map((d) => d.date))}.` });
  }
  if (summary.submitted > 0 && missedDays.length === 0 && lateDays.length === 0) {
    highlights.push({ tone: "ok", text: `Every report in the period was sent on time.` });
  } else if (best && best.days >= 5) {
    highlights.push({
      tone: "ok",
      text: `Longest run of reports without a gap: ${best.days} working days, ${shortDate(best.from)} to ${shortDate(best.to)}.`,
    });
  }
  if (commentCount > 0) {
    highlights.push({
      tone: "info",
      text: `${plural(commentCount, "comment")} on ${plural(commented.length, "report")}; ${first} replied on ${replied} of them.`,
    });
  }
  if (summary.attendance.unmarked > 0) {
    highlights.push({
      tone: "info",
      text: `Attendance not marked on ${plural(summary.attendance.unmarked, "working day")}; those days are left out of the attendance counts.`,
    });
  }

  const shiftType = shiftFor(end);
  return {
    person: raw.person,
    orgName: raw.orgName,
    period: { from: start, to: end, label: periodLabel(from, to), asOf },
    deadlineLabel: hourLabel(raw.deadlineHourLocal),
    shiftLabel: `${shiftType === "fulltime" ? "Full-time" : shiftType === "morning" ? "Morning" : "Evening"} shift from ${clockLabel(raw.shiftStarts[shiftType].slice(0, 5))}`,
    days,
    months,
    weeks,
    summary,
    highlights,
  };
}

export function recordFileName(name: string, from: string, to: string): string {
  const safe = name.replace(/[\\/:*?"<>|]+/g, "").trim();
  return `${safe} - ${periodLabel(from, to)} - Dossier.pdf`;
}

/** What the dialog needs to show counts and estimate pages for any choice. */
export interface RecordPreview {
  from: string;
  to: string;
  label: string;
  fileName: string;
  expected: number;
  submitted: number;
  missed: number;
  marked: number;
  comments: number;
  commentedReports: number;
  months: number;
  reportUnits: number;
  commentUnits: number;
  missedUnits: number;
}

export function recordPreview(record: EmployeeRecord, requestedTo: string): RecordPreview {
  let reportUnits = 0;
  let commentUnits = 0;
  let missedUnits = 0;
  for (const d of record.days) {
    if (d.report) {
      reportUnits += 3 + d.report.answers.reduce((n, a) => n + (a.kind === "text" ? a.lines.length + 1 : 1), 0);
      commentUnits += d.report.comments.length * 2;
    } else if (d.reportStatus === "missed" || d.reportStatus === "leave") {
      missedUnits += 1.5;
    }
  }
  const a = record.summary.attendance;
  return {
    from: record.period.from,
    to: requestedTo,
    label: record.period.label,
    fileName: recordFileName(record.person.name, record.period.from, requestedTo),
    expected: record.summary.expected,
    submitted: record.summary.submitted,
    missed: record.summary.missed,
    marked: a.present + a.late + a.absent + a.leave + a.halfLeave + a.wfh + a.holiday,
    comments: record.summary.comments,
    commentedReports: record.summary.commentedReports,
    months: record.months.length,
    reportUnits,
    commentUnits,
    missedUnits,
  };
}

export function estimatePagesFromPreview(
  preview: RecordPreview,
  sections: RecordSections,
  options: RecordOptions,
): number {
  let pages = 1;
  if (sections.attendance) pages += preview.months;
  if (sections.reports) {
    const units =
      preview.reportUnits +
      (sections.comments ? preview.commentUnits : 0) +
      (options.showMissed ? preview.missedUnits : 0);
    pages += Math.max(1, Math.ceil(units / 48));
  }
  if (options.reviewPage) pages += 1;
  return pages;
}
