"use client";

import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_SHORT,
  SHIFT_TYPE_LABELS,
  type AttendanceRecord,
  type AttendanceStatus,
  type ShiftAssignment,
} from "@/types/attendance";
import { calendarDayToneClass } from "@/lib/helpers/attendance-day-tones";
import { formatDate, isWorkingDay } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";
import { AttendanceLegend } from "@/components/attendance/attendance-legend";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRESENT_STATUSES: ReadonlySet<AttendanceStatus> = new Set([
  "present",
  "late_minor",
  "late_major",
]);

const NON_WORKING_STATUSES: ReadonlySet<AttendanceStatus> = new Set([
  "weekly_off",
  "holiday",
]);

function isoWeekday(dateStr: string): number {
  const utcDay = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

function formatCheckIn(time: string | null): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

function formatMonthTitle(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatOptionalStat(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}

export function PersonalMonthCalendar({
  records,
  yearMonth,
  workingDays,
  today,
  shift,
  leaveBalance,
  fines,
}: {
  records: AttendanceRecord[];
  yearMonth: string;
  workingDays: number[];
  today: string;
  shift: ShiftAssignment | null;
  leaveBalance?: number;
  fines?: number;
}) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const recordsByDate = new Map(records.map((r) => [r.date, r]));

  const firstDate = `${yearMonth}-01`;
  const leadingEmpty = isoWeekday(firstDate) - 1;

  const cells: (
    | { kind: "empty"; key: string }
    | {
        kind: "day";
        key: string;
        day: number;
        date: string;
        record: AttendanceRecord | null;
        isFuture: boolean;
        isToday: boolean;
        isOff: boolean;
      }
  )[] = [];

  for (let i = 0; i < leadingEmpty; i++) {
    cells.push({ kind: "empty", key: `pad-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${yearMonth}-${String(day).padStart(2, "0")}`;
    const record = recordsByDate.get(date) ?? null;
    const isOff = !isWorkingDay(date, workingDays);
    cells.push({
      kind: "day",
      key: date,
      day,
      date,
      record,
      isFuture: date > today,
      isToday: date === today,
      isOff,
    });
  }

  const shiftLabel = shift ? SHIFT_TYPE_LABELS[shift.shift_type] : "—";

  const lateCount = records.filter(
    (record) =>
      record.status === "late_minor" || record.status === "late_major",
  ).length;
  const absentCount = records.filter(
    (record) => record.status === "absent",
  ).length;
  const leaveCount = records.filter(
    (record) => record.status === "leave" || record.status === "half_leave",
  ).length;

  const presentDays = records.filter(
    (record) =>
      record.date <= today && PRESENT_STATUSES.has(record.status),
  ).length;

  let workingDaysSoFar = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${yearMonth}-${String(day).padStart(2, "0")}`;
    if (date > today) break;
    const record = recordsByDate.get(date);
    if (record && NON_WORKING_STATUSES.has(record.status)) continue;
    if (!isWorkingDay(date, workingDays)) continue;
    workingDaysSoFar++;
  }

  const attendanceRate =
    workingDaysSoFar === 0
      ? null
      : Math.round((presentDays / workingDaysSoFar) * 100);

  const monthStats: { label: string; value: string; accent: string }[] = [
    { label: "Late", value: String(lateCount), accent: "border-yellow-500" },
    { label: "Absent", value: String(absentCount), accent: "border-red-500" },
    { label: "Leaves", value: String(leaveCount), accent: "border-amber-500" },
    {
      label: "Balance",
      value: formatOptionalStat(leaveBalance),
      accent: "border-emerald-500",
    },
    {
      label: "Fines",
      value: formatOptionalStat(fines),
      accent: "border-red-500/40",
    },
  ];

  const paddedCells = [...cells];
  while (paddedCells.length % 7 !== 0) {
    paddedCells.push({
      kind: "empty",
      key: `tail-${paddedCells.length}`,
    });
  }
  const weeks: (typeof cells)[] = [];
  for (let index = 0; index < paddedCells.length; index += 7) {
    weeks.push(paddedCells.slice(index, index + 7));
  }

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-stretch">
      <Card className="w-full flex-1 lg:w-3/4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{formatMonthTitle(yearMonth)}</CardTitle>
          <CardAction>
            <AttendanceLegend variant="calendar" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                {label}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div
              key={week[0]?.key ?? weekIndex}
              className={cn(
                "grid grid-cols-7 gap-1.5 pb-1.5",
                weekIndex < weeks.length - 1 && "border-b border-foreground/5",
              )}
            >
              {week.map((cell) => {
                if (cell.kind === "empty") {
                  return <div key={cell.key} className="h-12" />;
                }

                const status: AttendanceStatus | null =
                  cell.record?.status ??
                  (cell.isOff && !cell.isFuture ? "weekly_off" : null);
                const shortCode = status
                  ? ATTENDANCE_STATUS_SHORT[status]
                  : cell.isFuture
                    ? ""
                    : "—";
                const interactive = !cell.isFuture;

                const dayButton = (
                  <button
                    type="button"
                    disabled={!interactive}
                    className={cn(
                      "box-border flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-md text-sm font-medium transition-colors",
                      cell.isToday
                        ? "border-2 border-foreground bg-transparent text-foreground"
                        : cell.isFuture
                          ? "bg-transparent text-muted-foreground/40"
                          : calendarDayToneClass(status),
                      interactive && "cursor-pointer",
                    )}
                    aria-label={
                      status
                        ? `${formatDate(cell.date)}: ${ATTENDANCE_STATUS_LABELS[status]}`
                        : formatDate(cell.date)
                    }
                  >
                    <span
                      className={cn(
                        "text-sm leading-none tabular-nums",
                        cell.isToday ? "opacity-80" : "opacity-70",
                      )}
                    >
                      {cell.day}
                    </span>
                    <span className="text-xs font-semibold leading-none">
                      {shortCode}
                    </span>
                  </button>
                );

                if (!interactive) {
                  return <div key={cell.key}>{dayButton}</div>;
                }

                return (
                  <Popover key={cell.key}>
                    <PopoverTrigger asChild>{dayButton}</PopoverTrigger>
                    <PopoverContent align="start" className="w-56 p-3">
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(cell.date)}
                      </p>
                      <dl className="mt-2 flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">Status</dt>
                          <dd className="font-medium text-foreground">
                            {status
                              ? ATTENDANCE_STATUS_LABELS[status]
                              : "No record"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">Shift</dt>
                          <dd className="font-medium text-foreground">
                            {shiftLabel}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">Check-in</dt>
                          <dd className="font-medium tabular-nums text-foreground">
                            {formatCheckIn(cell.record?.check_in_time ?? null)}
                          </dd>
                        </div>
                      </dl>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="w-full lg:w-1/4">
        <CardContent className="flex flex-col">
          <div className="border-b border-foreground/10 pb-4">
            <p className="text-4xl font-bold tabular-nums text-foreground">
              {attendanceRate === null ? "—" : `${attendanceRate}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Attendance Rate
            </p>
            <div className="mt-3 h-1 w-full rounded bg-foreground/10">
              <div
                className="h-1 rounded bg-emerald-500 transition-[width]"
                style={{
                  width:
                    attendanceRate === null ? "0%" : `${attendanceRate}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {monthStats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "flex flex-col gap-1 border-l-4 py-3 pl-3",
                  stat.accent,
                )}
              >
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </span>
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
