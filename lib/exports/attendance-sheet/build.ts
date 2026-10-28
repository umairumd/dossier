// The team attendance sheet for one month: one row per person, one column
// per day, totals for payroll. Shared by the Excel and PDF exports.
import { isWorkingDay, lastDayOfMonth } from "@/lib/helpers/dates";
import {
  ATTENDANCE_STATUS_SHORT,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/types/attendance";

export type SheetTone = "ok" | "warn" | "danger" | "leave" | "wfh" | "off" | "muted";

export interface SheetPerson {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  employment: "Full-time" | "Part-time";
  remote: boolean;
  /** Leave days left now (from the leave ledger). */
  leaveBalance: number | null;
  joinedOn: string | null;
}

export interface SheetDay {
  date: string;
  day: number;
  weekday: string;
  working: boolean;
}

export interface SheetCell {
  code: string;
  tone: SheetTone | null;
}

export interface SheetTotals {
  onTime: number;
  late: number;
  veryLate: number;
  fromHome: number;
  leaveDays: number;
  halfDays: number;
  absent: number;
  unmarked: number;
  leaveDeducted: number;
  fines: number;
}

export interface SheetRow {
  person: SheetPerson;
  cells: SheetCell[];
  totals: SheetTotals;
}

export interface SheetGroup {
  title: string;
  rows: SheetRow[];
}

export interface AttendanceSheet {
  month: string;
  label: string;
  orgName: string;
  days: SheetDay[];
  groups: SheetGroup[];
  generatedBy: string;
  generatedOn: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_TONE: Record<AttendanceStatus, SheetTone> = {
  present: "ok",
  late_minor: "warn",
  late_major: "danger",
  work_from_home: "wfh",
  leave: "leave",
  half_leave: "leave",
  absent: "danger",
  weekly_off: "off",
  holiday: "off",
};

export const TONE_LEGEND: { code: string; label: string; tone: SheetTone }[] = [
  { code: "P", label: "Present", tone: "ok" },
  { code: "L", label: "Late", tone: "warn" },
  { code: "VL", label: "Very late", tone: "danger" },
  { code: "R", label: "Work from home", tone: "wfh" },
  { code: "✓", label: "Remote, report sent", tone: "ok" },
  { code: "LV", label: "Leave", tone: "leave" },
  { code: "HL", label: "Half leave", tone: "leave" },
  { code: "A", label: "Absent", tone: "danger" },
  { code: "OFF", label: "Day off", tone: "off" },
  { code: "H", label: "Holiday", tone: "off" },
  { code: "—", label: "Not marked", tone: "muted" },
];

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function sheetFileName(orgName: string, month: string, extension: "pdf"): string {
  const org = orgName.replace(/[^\p{L}\p{N} ]+/gu, "").trim() || "Dossier";
  return `${org} attendance ${monthLabel(month)}.${extension}`;
}

function emptyTotals(): SheetTotals {
  return {
    onTime: 0,
    late: 0,
    veryLate: 0,
    fromHome: 0,
    leaveDays: 0,
    halfDays: 0,
    absent: 0,
    unmarked: 0,
    leaveDeducted: 0,
    fines: 0,
  };
}

export function buildAttendanceSheet(input: {
  month: string;
  orgName: string;
  people: SheetPerson[];
  records: AttendanceRecord[];
  /** "<profileId>_<date>" for every report sent this month. */
  reportKeys: Set<string>;
  workingDays: number[];
  today: string;
  generatedBy: string;
  generatedOn: string;
}): AttendanceSheet {
  const { month, today } = input;
  const last = Number(lastDayOfMonth(month).slice(8, 10));
  const days: SheetDay[] = Array.from({ length: last }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    return {
      date,
      day: index + 1,
      weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()],
      working: isWorkingDay(date, input.workingDays),
    };
  });

  const byKey = new Map(input.records.map((record) => [`${record.profile_id}_${record.date}`, record]));

  const rowFor = (person: SheetPerson): SheetRow => {
    const totals = emptyTotals();
    const cells = days.map((day): SheetCell => {
      if (person.joinedOn && day.date < person.joinedOn) return { code: "", tone: null };
      const record = byKey.get(`${person.id}_${day.date}`);
      if (record) {
        totals.fines += Number(record.fine_amount ?? 0);
        totals.leaveDeducted += Number(record.leave_deducted ?? 0);
        switch (record.status) {
          case "present":
            totals.onTime += 1;
            break;
          case "late_minor":
            totals.late += 1;
            break;
          case "late_major":
            totals.veryLate += 1;
            break;
          case "work_from_home":
            totals.fromHome += 1;
            break;
          case "leave":
            totals.leaveDays += 1;
            break;
          case "half_leave":
            totals.leaveDays += 0.5;
            totals.halfDays += 1;
            break;
          case "absent":
            totals.absent += 1;
            break;
          default:
            break;
        }
        return { code: ATTENDANCE_STATUS_SHORT[record.status], tone: STATUS_TONE[record.status] };
      }
      if (day.date > today) return { code: "", tone: null };
      if (!day.working) return { code: "OFF", tone: "off" };
      if (person.remote && input.reportKeys.has(`${person.id}_${day.date}`)) {
        totals.fromHome += 1;
        return { code: "✓", tone: "ok" };
      }
      // Today isn't "not marked" until the day is over.
      if (day.date === today) return { code: "", tone: null };
      totals.unmarked += 1;
      return { code: "—", tone: "muted" };
    });
    return { person, cells, totals };
  };

  const sorted = [...input.people].sort((a, b) => a.name.localeCompare(b.name));
  const groups: SheetGroup[] = [
    { title: "On-site", rows: sorted.filter((person) => !person.remote).map(rowFor) },
    { title: "Remote", rows: sorted.filter((person) => person.remote).map(rowFor) },
  ].filter((group) => group.rows.length > 0);

  return {
    month,
    label: monthLabel(month),
    orgName: input.orgName,
    days,
    groups,
    generatedBy: input.generatedBy,
    generatedOn: input.generatedOn,
  };
}
