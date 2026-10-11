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
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
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

// Month summary beside the calendar; dots use the calendar's day tones.
const SUMMARY_DOT: Record<
  "present" | "late" | "absent" | "leave" | "wfh",
  string
> = {
  present: "bg-ok",
  late: "bg-warn",
  absent: "bg-danger",
  leave: "bg-leave",
  wfh: "bg-info",
};

export function PersonalMonthCalendar({
  records,
  yearMonth,
  workingDays,
  today,
  shift,
}: {
  records: AttendanceRecord[];
  yearMonth: string;
  workingDays: number[];
  today: string;
  shift: ShiftAssignment | null;
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
  const pastRecords = records.filter((record) => record.date <= today);

  const lateCount = pastRecords.filter(
    (record) =>
      record.status === "late_minor" || record.status === "late_major",
  ).length;
  const absentCount = pastRecords.filter(
    (record) => record.status === "absent",
  ).length;
  const leaveCount = pastRecords.filter(
    (record) => record.status === "leave" || record.status === "half_leave",
  ).length;

  const presentDays = records.filter(
    (record) => record.date <= today && PRESENT_STATUSES.has(record.status),
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

  const wfhCount = pastRecords.filter(
    (record) => record.status === "work_from_home",
  ).length;
  const onTimeCount = pastRecords.filter(
    (record) => record.status === "present",
  ).length;

  const summary: {
    key: keyof typeof SUMMARY_DOT;
    label: string;
    value: number;
  }[] = [
    { key: "present", label: "On time", value: onTimeCount },
    { key: "late", label: "Late", value: lateCount },
    { key: "absent", label: "Absent", value: absentCount },
    { key: "leave", label: "Leave", value: leaveCount },
    ...(wfhCount > 0
      ? [{ key: "wfh" as const, label: "Work from home", value: wfhCount }]
      : []),
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
    <Card>
      <CardTitleHeader
        title="Your attendance"
        aside={
          <span className="-my-2 -mr-2 flex items-center gap-1">
            {shift ? <span>{shiftLabel}</span> : null}
            <AttendanceLegend variant="calendar" />
          </span>
        }
      />
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-0">
        <div className="flex min-w-0 flex-col gap-1.5 lg:pr-6">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="pb-1 text-center text-xs text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div
              key={week[0]?.key ?? weekIndex}
              className="grid grid-cols-7 gap-1.5"
            >
              {week.map((cell) => {
                if (cell.kind === "empty") {
                  return <div key={cell.key} className="h-11 sm:h-12" />;
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
                      "flex h-11 w-full flex-col items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-12",
                      cell.isFuture
                        ? "bg-transparent text-muted-foreground"
                        : calendarDayToneClass(status),
                      cell.isToday && "ring-2 ring-inset ring-foreground/80",
                      interactive && "cursor-pointer",
                    )}
                    aria-label={
                      status
                        ? `${formatDate(cell.date)}: ${ATTENDANCE_STATUS_LABELS[status]}`
                        : formatDate(cell.date)
                    }
                  >
                    <span className="text-[13px] leading-none tabular-nums opacity-75">
                      {cell.day}
                    </span>
                    {shortCode ? (
                      <span className="text-[11px] font-semibold leading-none">
                        {shortCode}
                      </span>
                    ) : null}
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
        </div>

        <aside className="flex flex-col gap-5 border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted-foreground">
              Attendance rate
            </span>
            <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
              {attendanceRate === null ? "—" : `${attendanceRate}%`}
            </span>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-fill-active">
              <div
                className="h-full rounded-full bg-ok transition-[width]"
                style={{ width: `${attendanceRate ?? 0}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {workingDaysSoFar === 0
                ? "No working days yet"
                : `Present ${presentDays} of ${workingDaysSoFar} working days`}
            </span>
          </div>

          <dl className="flex flex-col divide-y divide-line">
            {summary.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn("size-2 rounded-full", SUMMARY_DOT[item.key])}
                  />
                  {item.label}
                </dt>
                <dd className="text-sm font-medium tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </CardContent>
    </Card>
  );
}
