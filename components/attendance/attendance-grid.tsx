"use client";

import { CalendarDays } from "lucide-react";
import { AttendanceCell } from "./attendance-cell";
import { AttendanceCellPopover } from "./attendance-cell-popover";
import { EmployeeNameCell } from "./employee-name-cell";
import { HolidayDayHeader } from "./holiday-day-header";
import {
  RemoteDayCellPopover,
  RemoteDayCellVisual,
} from "./remote-day-cell-popover";
import { cn } from "@/lib/utils";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type {
  AttendanceRecord,
  AttendanceSettings,
} from "@/types/attendance";

interface GridEmployee {
  id: string;
  full_name: string;
  org_id: string;
  is_remote: boolean;
  employment_type: "full_time" | "part_time";
  designation: string | null;
  department_name: string | null;
  avatar_url: string | null;
  leave_balance: number;
}

function formatLeaveBalance(balance: number): string {
  const normalized = Object.is(balance, -0) ? 0 : balance;
  if (Number.isInteger(normalized)) {
    return String(normalized);
  }
  return normalized.toFixed(1);
}

function leaveBalanceClass(balance: number): string {
  if (balance > 0) {
    return "font-medium text-emerald-600 dark:text-emerald-400";
  }
  if (balance < 0) {
    return "font-medium text-red-600 dark:text-red-400";
  }
  return "text-muted-foreground";
}

function renderBalanceCell(balance: number) {
  return (
    <td className="bg-background px-3 py-2 text-center text-xs">
      <span className={leaveBalanceClass(balance)}>
        {formatLeaveBalance(balance)}
      </span>
    </td>
  );
}

export function AttendanceGrid({
  onSiteEmployees,
  remoteEmployees,
  remoteReportDates,
  records,
  yearMonth,
  settings,
  workingDays,
  orgId,
  deadline,
  profileBasePath,
  isReadOnly = false,
}: {
  onSiteEmployees: GridEmployee[];
  remoteEmployees: GridEmployee[];
  remoteReportDates: string[];
  records: AttendanceRecord[];
  yearMonth: string; // "YYYY-MM"
  settings: AttendanceSettings;
  workingDays: number[]; // [1,2,3,4,5] — ISO weekday numbers
  orgId: string;
  deadline: DeadlineContext;
  profileBasePath: string;
  isReadOnly?: boolean;
}) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const remoteReportSet = new Set(remoteReportDates);

  const recordMap = new Map<string, Map<string, AttendanceRecord>>();
  const holidayDates = new Set<string>();
  const holidayNames = new Map<string, string | null>();
  for (const record of records) {
    if (!recordMap.has(record.profile_id)) {
      recordMap.set(record.profile_id, new Map());
    }
    recordMap.get(record.profile_id)!.set(record.date, record);
    if (record.status === "holiday") {
      holidayDates.add(record.date);
      if (!holidayNames.has(record.date)) {
        holidayNames.set(record.date, record.holiday_name ?? null);
      }
    }
  }

  function isDayOff(dayNum: number): boolean {
    const date = new Date(year, month - 1, dayNum);
    const isoDay = date.getDay() === 0 ? 7 : date.getDay();
    return !workingDays.includes(isoDay);
  }

  function dateString(dayNum: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
  }

  function getDayInitial(dayNum: number): string {
    const date = new Date(year, month - 1, dayNum);
    return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][date.getDay()];
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  if (onSiteEmployees.length === 0 && remoteEmployees.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No employees to display.
      </div>
    );
  }

  function renderNameCell(emp: GridEmployee) {
    return (
      <EmployeeNameCell
        id={emp.id}
        fullName={emp.full_name}
        designation={emp.designation}
        departmentName={emp.department_name}
        employmentType={emp.employment_type}
        isRemote={emp.is_remote}
        avatarUrl={emp.avatar_url}
        profileBasePath={profileBasePath}
      />
    );
  }

  function renderOnSiteRow(emp: GridEmployee) {
    const empRecords = recordMap.get(emp.id) ?? new Map();

    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let fineTotal = 0;

    for (const record of empRecords.values()) {
      if (record.status === "late_minor" || record.status === "late_major")
        lateCount++;
      if (record.status === "absent") absentCount++;
      if (record.status === "leave" || record.status === "half_leave")
        leaveCount += record.leave_deducted;
      fineTotal += record.fine_amount;
    }

    return (
      <tr
        key={emp.id}
        className="border-b border-border/40 bg-card hover:bg-muted/40"
      >
        {renderNameCell(emp)}

        {days.map((day) => {
          const date = dateString(day);
          const record = empRecords.get(date) ?? null;
          const isOff = isDayOff(day);
          const isFuture = date > todayStr;

          if (isFuture) {
            return (
              <td key={day} className="bg-background px-1 py-1">
                <div className="flex h-8 w-full items-center justify-center rounded text-xs text-muted-foreground/30">
                  —
                </div>
              </td>
            );
          }

          return (
            <td key={day} className="bg-background px-1 py-1">
              {isReadOnly ? (
                <AttendanceCell status={record?.status ?? null} />
              ) : (
                <AttendanceCellPopover
                  profileId={emp.id}
                  orgId={emp.org_id || orgId}
                  date={date}
                  employeeName={emp.full_name}
                  existingRecord={record}
                  settings={settings}
                  isWeeklyOff={isOff}
                />
              )}
            </td>
          );
        })}

        <td className="bg-background px-3 py-2 text-center text-xs">
          {lateCount > 0 ? (
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {lateCount}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        <td className="bg-background px-3 py-2 text-center text-xs">
          {absentCount > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">
              {absentCount}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        <td className="bg-background px-3 py-2 text-center text-xs">
          {leaveCount > 0 ? (
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {leaveCount}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        {renderBalanceCell(emp.leave_balance)}
        <td className="bg-background px-3 py-2 text-center text-xs">
          {fineTotal > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">
              PKR {fineTotal}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      </tr>
    );
  }

  function renderRemoteRow(emp: GridEmployee) {
    const empRecords = recordMap.get(emp.id) ?? new Map();

    let leaveCount = 0;
    let absentCount = 0;

    for (const record of empRecords.values()) {
      if (record.status === "leave" || record.status === "half_leave") {
        leaveCount += record.leave_deducted;
      }
    }

    for (const day of days) {
      const date = dateString(day);
      if (date > todayStr) continue;
      if (isDayOff(day)) continue;
      const record = empRecords.get(date) ?? null;
      if (record?.status === "holiday") continue;
      if (record?.status === "leave" || record?.status === "half_leave")
        continue;
      if (record?.status === "present") continue;
      if (remoteReportSet.has(`${emp.id}_${date}`)) continue;
      absentCount++;
    }

    return (
      <tr
        key={emp.id}
        className="border-b border-border/40 bg-card hover:bg-muted/40"
      >
        {renderNameCell(emp)}

        {days.map((day) => {
          const date = dateString(day);
          const record = empRecords.get(date) ?? null;
          const isOff = isDayOff(day);
          const isFuture = date > todayStr;
          const isPast = date < todayStr;
          const hasReport = remoteReportSet.has(`${emp.id}_${date}`);
          const isHoliday = record?.status === "holiday";
          const showPopover = !isFuture && !isOff && !isHoliday;

          return (
            <td key={day} className="bg-background px-1 py-1">
              {showPopover ? (
                <RemoteDayCellPopover
                  profileId={emp.id}
                  orgId={emp.org_id || orgId}
                  date={date}
                  employeeName={emp.full_name}
                  designation={emp.designation}
                  avatarUrl={emp.avatar_url}
                  isRemote={emp.is_remote}
                  employmentType={emp.employment_type}
                  existingRecord={record}
                  hasReport={hasReport}
                  isPast={isPast}
                  deadline={deadline}
                  isReadOnly={isReadOnly}
                />
              ) : (
                <RemoteDayCellVisual
                  isOff={isOff}
                  isFuture={isFuture}
                  isPast={isPast}
                  record={record}
                  hasReport={hasReport}
                />
              )}
            </td>
          );
        })}

        <td className="bg-background px-3 py-2 text-center text-xs">
          <span className="text-muted-foreground">0</span>
        </td>
        <td className="bg-background px-3 py-2 text-center text-xs">
          {absentCount > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">
              {absentCount}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        <td className="bg-background px-3 py-2 text-center text-xs">
          {leaveCount > 0 ? (
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {leaveCount}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        {renderBalanceCell(emp.leave_balance)}
        <td className="bg-background px-3 py-2 text-center text-xs">
          <span className="text-muted-foreground">—</span>
        </td>
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-card">
            <th className="sticky left-0 z-20 min-w-48 bg-card px-4 py-2 text-left label-eyebrow">
              Employee
            </th>
            {days.map((day) => {
              const date = dateString(day);
              const isOff = isDayOff(day);
              const isHoliday = holidayDates.has(date);
              const isToday = date === todayStr;
              const dayInitial = getDayInitial(day);

              if (!isReadOnly) {
                return (
                  <HolidayDayHeader
                    key={day}
                    day={day}
                    date={date}
                    dayInitial={dayInitial}
                    isOff={isOff}
                    isHoliday={isHoliday}
                    isToday={isToday}
                    orgId={orgId}
                    holidayName={holidayNames.get(date) ?? null}
                  />
                );
              }

              return (
                <th
                  key={day}
                  className={cn(
                    "w-10 px-1 py-1.5 text-center",
                    isHoliday
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                      : isOff
                        ? "bg-muted/50"
                        : undefined,
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md px-0.5 py-0.5",
                      isToday && "bg-foreground text-background",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[9px] font-medium uppercase",
                        isToday
                          ? "text-background/70"
                          : isHoliday
                            ? "text-teal-600/70 dark:text-teal-400/70"
                            : isOff
                              ? "text-muted-foreground/60"
                              : "text-foreground",
                      )}
                    >
                      {dayInitial}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      {isHoliday && !isToday && (
                        <CalendarDays className="size-3" aria-hidden />
                      )}
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isToday
                            ? "font-bold text-background"
                            : isHoliday
                              ? "text-teal-600 dark:text-teal-400"
                              : isOff
                                ? "text-muted-foreground/60"
                                : "text-foreground",
                        )}
                      >
                        {day}
                      </span>
                    </span>
                  </div>
                </th>
              );
            })}
            <th className="bg-muted/30 px-3 py-2 text-center label-eyebrow">
              Late
            </th>
            <th className="bg-muted/30 px-3 py-2 text-center label-eyebrow">
              Absent
            </th>
            <th className="bg-muted/30 px-3 py-2 text-center label-eyebrow">
              Leaves
            </th>
            <th className="bg-muted/30 px-3 py-2 text-center label-eyebrow">
              Balance
            </th>
            <th className="bg-muted/30 px-3 py-2 text-center label-eyebrow">
              Fines
            </th>
          </tr>
        </thead>
        <tbody>
          {onSiteEmployees.map((emp) => renderOnSiteRow(emp))}

          {remoteEmployees.length > 0 && (
            <tr>
              <td className="sticky left-0 z-20 h-10 border-y border-border bg-card px-3 py-2 align-middle label-eyebrow">
                Remote Employees
              </td>
              <td
                colSpan={days.length + 5}
                className="h-10 border-y border-border bg-background"
              />
            </tr>
          )}

          {remoteEmployees.map((emp) => renderRemoteRow(emp))}
        </tbody>
      </table>
    </div>
  );
}
