"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MonthNav } from "@/components/attendance/month-nav";
import { PersonalMonthCalendar } from "@/components/attendance/personal-month-calendar";
import { loadEmployeeMonth } from "@/lib/actions/admin/employee-attendance";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, ShiftAssignment } from "@/types/attendance";

/** Someone's month calendar on their profile; switching months only reloads this card. */
export function EmployeeMonthCalendar({
  profileId,
  initialMonth,
  initialRecords,
  currentMonth,
  workingDays,
  today,
  shift,
  title,
}: {
  profileId: string;
  initialMonth: string;
  initialRecords: AttendanceRecord[];
  currentMonth: string;
  workingDays: number[];
  today: string;
  shift: ShiftAssignment | null;
  title: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [records, setRecords] = useState(initialRecords);
  const [pending, startTransition] = useTransition();

  const change = (next: string) => {
    if (next === month) return;
    startTransition(async () => {
      const result = await loadEmployeeMonth(profileId, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMonth(next);
      setRecords(result.records);
      // Keep the month in the address so a refresh or shared link opens it.
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("month", next);
        window.history.replaceState(window.history.state, "", url);
      } catch {
        // The address is a convenience only.
      }
    });
  };

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <PersonalMonthCalendar
        headerAction={
          <MonthNav month={month} currentMonth={currentMonth} onMonthChange={change} pending={pending} />
        }
        records={records}
        yearMonth={month}
        workingDays={workingDays}
        today={today}
        shift={shift}
        title={title}
      />
    </div>
  );
}
