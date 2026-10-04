"use client";

import Link from "next/link";
import { getDaysInMonth } from "date-fns";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { AttendanceCell } from "./attendance-cell";
import {
  AttendanceCellPopover,
  cellColorClass,
} from "./attendance-cell-popover";
import { EmployeeNameCell } from "./employee-name-cell";
import { HolidayDayHeader } from "./holiday-day-header";
import {
  RemoteDayCellPopover,
  RemoteDayCellVisual,
} from "./remote-day-cell-popover";
import { cn } from "@/lib/utils";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import {
  ATTENDANCE_STATUS_SHORT,
  type AttendanceRecord,
  type AttendanceSettings,
  type AttendanceStatus,
} from "@/types/attendance";
import type { UserRole } from "@/types/profile";

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
  /** YYYY-MM-DD the profile was created; days before this are not expected. */
  joined_on: string | null;
}

function formatLeaveBalance(balance: number): string {
  const normalized = Object.is(balance, -0) ? 0 : balance;
  if (Number.isInteger(normalized)) {
    return String(normalized);
  }
  return normalized.toFixed(1);
}

function formatFineCompact(amount: number): string {
  if (!(amount > 0)) return "—";
  if (amount < 1000) return String(amount);
  const scaled = Math.round((amount / 1000) * 10) / 10;
  return Number.isInteger(scaled) ? `${scaled}k` : `${scaled}k`;
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
  today,
  viewerRole,
  currentUserId,
  showBalanceAndFines = true,
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
  today: string; // YYYY-MM-DD in the organization's timezone
  viewerRole?: UserRole;
  currentUserId?: string;
  showBalanceAndFines?: boolean;
}) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
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

  const todayStr = today;

  function summarizeOnSite(emp: GridEmployee) {
    const empRecords = recordMap.get(emp.id) ?? new Map();

    let late = 0;
    let absent = 0;
    let leaves = 0;
    let fines = 0;

    for (const record of empRecords.values()) {
      if (record.status === "late_minor" || record.status === "late_major") {
        late++;
      }
      if (record.status === "absent") absent++;
      if (record.status === "leave" || record.status === "half_leave") {
        leaves += record.leave_deducted;
      }
      fines += record.fine_amount;
    }

    return { late, absent, leaves, fines };
  }

  function summarizeRemote(emp: GridEmployee) {
    const empRecords = recordMap.get(emp.id) ?? new Map();

    let leaves = 0;
    let absent = 0;

    for (const record of empRecords.values()) {
      if (record.status === "leave" || record.status === "half_leave") {
        leaves += record.leave_deducted;
      }
    }

    for (const day of days) {
      const date = dateString(day);
      if (date > todayStr) continue;
      if (emp.joined_on && date < emp.joined_on) continue;
      if (isDayOff(day)) continue;
      const record = empRecords.get(date) ?? null;
      if (record?.status === "holiday") continue;
      if (record?.status === "leave" || record?.status === "half_leave") {
        continue;
      }
      if (record?.status === "present") continue;
      if (remoteReportSet.has(`${emp.id}_${date}`)) continue;
      absent++;
    }

    return { late: 0, absent, leaves, fines: 0 };
  }

  if (onSiteEmployees.length === 0 && remoteEmployees.length === 0) {
    return <EmptyState illustration="employees" title="No employees to display." />;
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
    const { late, absent, leaves, fines } = summarizeOnSite(emp);

    return (
      <tr
        key={emp.id}
        className="border-b border-border/40 bg-card transition-colors hover:bg-foreground/5"
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
            <td
              key={day}
              className="bg-background px-1 py-1"
              onClick={() =>
                handleDayCellClick(emp.id, new Date(year, month - 1, day))
              }
            >
              {isReadOnly ? (
                <AttendanceCell
                  status={record?.status ?? (isOff ? "weekly_off" : null)}
                />
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
          {late > 0 ? (
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {late}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        <td className="bg-background px-3 py-2 text-center text-xs">
          {absent > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">
              {absent}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        <td className="bg-background px-3 py-2 text-center text-xs">
          {leaves > 0 ? (
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {leaves}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        {showBalanceAndFines && (
          <>
            {renderBalanceCell(emp.leave_balance)}
            <td className="bg-background px-3 py-2 text-center text-xs">
              {fines > 0 ? (
                <span className="font-medium text-red-600 dark:text-red-400">
                  PKR {fines}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
          </>
        )}
      </tr>
    );
  }

  function renderRemoteRow(emp: GridEmployee) {
    const empRecords = recordMap.get(emp.id) ?? new Map();
    const { absent, leaves } = summarizeRemote(emp);

    return (
      <tr
        key={emp.id}
        className="border-b border-border/40 bg-card transition-colors hover:bg-foreground/5"
      >
        {renderNameCell(emp)}

        {days.map((day) => {
          const date = dateString(day);
          const record = empRecords.get(date) ?? null;
          const isOff = isDayOff(day);
          const isFuture = date > todayStr;
          const isPast = date < todayStr;
          const isBeforeJoin = Boolean(emp.joined_on && date < emp.joined_on);
          const hasReport = remoteReportSet.has(`${emp.id}_${date}`);
          const isHoliday = record?.status === "holiday";
          // Days before the employee joined are blank and not editable,
          // unless a record/report already exists for that date.
          const showPopover =
            !isFuture &&
            !isOff &&
            !isHoliday &&
            !(isBeforeJoin && !record && !hasReport);

          return (
            <td
              key={day}
              className="bg-background px-1 py-1"
              onClick={() =>
                handleDayCellClick(emp.id, new Date(year, month - 1, day))
              }
            >
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
                  viewerRole={viewerRole}
                  currentUserId={currentUserId}
                />
              ) : (
                <RemoteDayCellVisual
                  isOff={isOff}
                  isFuture={isFuture}
                  isPast={isPast}
                  isBeforeJoin={isBeforeJoin}
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
          {absent > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">
              {absent}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        <td className="bg-background px-3 py-2 text-center text-xs">
          {leaves > 0 ? (
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {leaves}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        {showBalanceAndFines && (
          <>
            {renderBalanceCell(emp.leave_balance)}
            <td className="bg-background px-3 py-2 text-center text-xs">
              <span className="text-muted-foreground">—</span>
            </td>
          </>
        )}
      </tr>
    );
  }

  const todayMonth = todayStr.slice(0, 7);
  const todayDay = Number(todayStr.slice(8, 10));
  const daysToShow =
    yearMonth < todayMonth
      ? daysInMonth
      : yearMonth > todayMonth
        ? 0
        : Math.min(todayDay, daysInMonth);
  const visibleDays = days.slice(0, daysToShow);

  function handleDayCellClick(employeeId: string, date: Date) {
    if (isReadOnly || !employeeId || Number.isNaN(date.getTime())) return;
  }

  function monthCell(
    emp: GridEmployee,
    dayNum: number,
  ): { label: string; className: string; status: AttendanceStatus | null } {
    const date = dateString(dayNum);
    const record = recordMap.get(emp.id)?.get(date) ?? null;
    const off = isDayOff(dayNum);
    const beforeJoin = Boolean(emp.joined_on && date < emp.joined_on);
    const hasReport = remoteReportSet.has(`${emp.id}_${date}`);

    let status: AttendanceStatus | null = record?.status ?? null;

    if (beforeJoin && !record && !hasReport) {
      status = off ? "weekly_off" : null;
    } else if (emp.is_remote) {
      if (!status) {
        if (hasReport) status = "present";
        else if (off) status = "weekly_off";
        else if (date < todayStr) status = "absent";
      } else if (status === "weekly_off" && hasReport) {
        status = "present";
      }
    } else if (!status && off) {
      status = "weekly_off";
    }

    if (status === "weekly_off") {
      return {
        label: "OFF",
        className: "bg-muted text-muted-foreground/40",
        status,
      };
    }

    return {
      label: status ? ATTENDANCE_STATUS_SHORT[status] : "—",
      className: cellColorClass(status),
      status,
    };
  }

  function renderMobileCard(
    emp: GridEmployee,
    summary: { late: number; absent: number; leaves: number; fines: number },
  ) {
    return (
      <div
        key={emp.id}
        className="flex flex-col rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <div className="flex items-center gap-3">
          <MemberAvatar
            userId={emp.id}
            name={emp.full_name}
            avatarUrl={emp.avatar_url ?? undefined}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`${profileBasePath}/${emp.id}`}
              className="block truncate font-medium hover:underline"
            >
              {emp.full_name}
            </Link>
            {emp.designation && (
              <p className="truncate text-sm text-muted-foreground">
                {emp.designation}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1 text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
            Attendance
          </p>
          <div className="grid grid-cols-11 gap-1">
            {visibleDays.map((day) => {
              const date = dateString(day);
              const cell = monthCell(emp, day);
              const record = recordMap.get(emp.id)?.get(date) ?? null;
              const off = isDayOff(day);
              const beforeJoin = Boolean(emp.joined_on && date < emp.joined_on);
              const hasReport = remoteReportSet.has(`${emp.id}_${date}`);
              const cellClass = cn(
                "flex aspect-square w-full items-center justify-center rounded-sm text-[11px] font-bold",
                cell.className,
                date === todayStr && "ring-1 ring-white/30",
              );
              const openEditor = () =>
                handleDayCellClick(emp.id, new Date(year, month - 1, day));

              if (!emp.is_remote && !isReadOnly) {
                return (
                  <div key={day} className="contents" onClick={openEditor}>
                    <AttendanceCellPopover
                      profileId={emp.id}
                      orgId={emp.org_id || orgId}
                      date={date}
                      employeeName={emp.full_name}
                      existingRecord={record}
                      settings={settings}
                      isWeeklyOff={off}
                      triggerClassName={cn(cellClass, "h-auto cursor-pointer")}
                    />
                  </div>
                );
              }

              const remoteEditable =
                emp.is_remote &&
                !isReadOnly &&
                !off &&
                record?.status !== "holiday" &&
                !(beforeJoin && !record && !hasReport);

              if (remoteEditable) {
                return (
                  <div key={day} className="contents" onClick={openEditor}>
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
                    isPast={date < todayStr}
                    deadline={deadline}
                    isReadOnly={isReadOnly}
                    viewerRole={viewerRole}
                    currentUserId={currentUserId}
                    triggerLabel={cell.label}
                    triggerClassName={cn(cellClass, "cursor-pointer")}
                  />
                  </div>
                );
              }

              return (
                <div key={day} className={cellClass} onClick={openEditor}>
                  {cell.label}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[10px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">
            Stats This Month
          </p>
          <div
            className={cn(
              "grid gap-1.5",
              showBalanceAndFines ? "grid-cols-5" : "grid-cols-3",
            )}
          >
            {[
              {
                label: "Late",
                value: summary.late,
                color: summary.late > 0 ? "text-yellow-500" : "",
              },
              {
                label: "Absent",
                value: summary.absent,
                color: summary.absent > 0 ? "text-red-500" : "",
              },
              {
                label: "Leaves",
                value: summary.leaves,
                color:
                  summary.leaves > 0
                    ? "text-purple-600 dark:text-purple-400"
                    : "",
              },
              ...(showBalanceAndFines
                ? [
                    {
                      label: "Balance",
                      value: formatLeaveBalance(emp.leave_balance),
                      color: leaveBalanceClass(emp.leave_balance),
                    },
                    {
                      label: "Fines",
                      value: formatFineCompact(summary.fines),
                      color: summary.fines
                        ? "text-red-500"
                        : "text-muted-foreground",
                    },
                  ]
                : []),
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex flex-col items-center rounded-lg bg-muted/40 px-1 py-1.5"
              >
                <span
                  className={cn("text-sm font-semibold tabular-nums", color)}
                >
                  {value}
                </span>
                <span className="text-[10px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:hidden">
        {onSiteEmployees.map((emp) =>
          renderMobileCard(emp, summarizeOnSite(emp)),
        )}
        {remoteEmployees.length > 0 && (
          <p className="label-eyebrow">Remote Employees</p>
        )}
        {remoteEmployees.map((emp) =>
          renderMobileCard(emp, summarizeRemote(emp)),
        )}
        <p className="text-xs text-muted-foreground">
          The full day-by-day grid is available on larger screens.
        </p>
      </div>
      <div className="hidden overflow-x-auto rounded-xl ring-1 ring-foreground/10 md:block">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky top-0 left-0 z-40 min-w-36 bg-card px-3 py-2 text-left label-eyebrow md:min-w-48 md:px-4">
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
                    "sticky top-0 z-30 w-10 bg-card px-1 py-1.5 text-center",
                    isHoliday && "text-teal-600 dark:text-teal-400",
                    isOff && !isHoliday && "text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md px-0.5 py-0.5",
                      isHoliday && "bg-teal-500/10",
                      isOff && !isHoliday && "bg-muted/50",
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
            <th className="sticky top-0 z-30 bg-card px-3 py-2 text-center label-eyebrow">
              Late
            </th>
            <th className="sticky top-0 z-30 bg-card px-3 py-2 text-center label-eyebrow">
              Absent
            </th>
            <th className="sticky top-0 z-30 bg-card px-3 py-2 text-center label-eyebrow">
              Leaves
            </th>
            {showBalanceAndFines && (
              <>
                <th className="sticky top-0 z-30 bg-card px-3 py-2 text-center label-eyebrow">
                  Balance
                </th>
                <th className="sticky top-0 z-30 bg-card px-3 py-2 text-center label-eyebrow">
                  Fines
                </th>
              </>
            )}
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
                colSpan={days.length + (showBalanceAndFines ? 5 : 3)}
                className="h-10 border-y border-border bg-background"
              />
            </tr>
          )}

          {remoteEmployees.map((emp) => renderRemoteRow(emp))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
