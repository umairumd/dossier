"use client";

import { AttendanceCellPopover } from "./attendance-cell-popover";
import { MemberAvatar } from "@/components/shared/member-avatar";
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
}

export function AttendanceGrid({
  employees,
  records,
  yearMonth,
  settings,
  workingDays,
}: {
  employees: GridEmployee[];
  records: AttendanceRecord[];
  yearMonth: string; // "YYYY-MM"
  settings: AttendanceSettings;
  workingDays: number[]; // [1,2,3,4,5] — ISO weekday numbers
}) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Build a lookup: profileId -> date -> record
  const recordMap = new Map<string, Map<string, AttendanceRecord>>();
  for (const record of records) {
    if (!recordMap.has(record.profile_id)) {
      recordMap.set(record.profile_id, new Map());
    }
    recordMap.get(record.profile_id)!.set(record.date, record);
  }

  // Determine if a day number is a weekly off
  function isDayOff(dayNum: number): boolean {
    const date = new Date(year, month - 1, dayNum);
    // getDay() returns 0=Sun,1=Mon...6=Sat
    // workingDays uses ISO: 1=Mon...7=Sun
    const isoDay = date.getDay() === 0 ? 7 : date.getDay();
    return !workingDays.includes(isoDay);
  }

  function dateString(dayNum: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
  }

  // Day column header color — off days are muted
  function dayHeaderClass(dayNum: number): string {
    return isDayOff(dayNum)
      ? "text-muted-foreground/50"
      : "text-muted-foreground";
  }

  if (employees.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No employees to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {/* Sticky employee name column */}
            <th className="sticky left-0 z-10 min-w-48 bg-muted/30 px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              Employee
            </th>
            {days.map((day) => (
              <th
                key={day}
                className={`w-10 px-1 py-2 text-center text-xs font-medium ${dayHeaderClass(day)}`}
              >
                {day}
              </th>
            ))}
            {/* Summary columns */}
            <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
              Late
            </th>
            <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
              Absent
            </th>
            <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
              Leaves
            </th>
            <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
              Fines
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, idx) => {
            const empRecords = recordMap.get(emp.id) ?? new Map();

            // Compute summary totals
            let lateCount = 0;
            let absentCount = 0;
            let leaveCount = 0;
            let fineTotal = 0;

            for (const record of empRecords.values()) {
              if (
                record.status === "late_minor" ||
                record.status === "late_major"
              )
                lateCount++;
              if (record.status === "absent") absentCount++;
              if (record.status === "leave" || record.status === "half_leave")
                leaveCount += record.leave_deducted;
              fineTotal += record.fine_amount;
            }

            return (
              <tr
                key={emp.id}
                className={
                  idx % 2 === 0
                    ? "border-b border-border/50"
                    : "border-b border-border/50 bg-muted/10"
                }
              >
                {/* Sticky name cell */}
                <td className="sticky left-0 z-10 min-w-48 bg-background px-4 py-2">
                  <div className="flex items-center gap-2">
                    <MemberAvatar
                      name={emp.full_name}
                      userId={emp.id}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {emp.full_name}
                      </p>
                      {emp.is_remote && (
                        <p className="text-[10px] text-muted-foreground">
                          Remote
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Day cells */}
                {days.map((day) => {
                  const date = dateString(day);
                  const record = empRecords.get(date) ?? null;
                  const isOff = isDayOff(day);
                  // Future dates — don't allow entry
                  const today = new Date().toISOString().slice(0, 10);
                  const isFuture = date > today;

                  if (isFuture) {
                    return (
                      <td key={day} className="px-1 py-1">
                        <div className="flex h-8 w-full items-center justify-center rounded text-xs text-muted-foreground/30">
                          —
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={day} className="px-1 py-1">
                      <AttendanceCellPopover
                        profileId={emp.id}
                        orgId={emp.org_id}
                        date={date}
                        employeeName={emp.full_name}
                        existingRecord={record}
                        settings={settings}
                        isWeeklyOff={isOff}
                      />
                    </td>
                  );
                })}

                {/* Summary cells */}
                <td className="px-3 py-2 text-center text-xs">
                  {lateCount > 0 ? (
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                      {lateCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-xs">
                  {absentCount > 0 ? (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {absentCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-xs">
                  {leaveCount > 0 ? (
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {leaveCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-xs">
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
          })}
        </tbody>
      </table>
    </div>
  );
}
