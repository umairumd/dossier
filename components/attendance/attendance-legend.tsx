"use client";

import { CalendarDays, Info } from "lucide-react";
import { cellColorClass } from "@/components/attendance/attendance-cell-popover";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_STATUS_SHORT,
  type AttendanceStatus,
} from "@/types/attendance";

const LEGEND_ITEMS: {
  code: string;
  label: string;
  status: AttendanceStatus;
}[] = [
  { code: ATTENDANCE_STATUS_SHORT.present, label: "Present", status: "present" },
  {
    code: ATTENDANCE_STATUS_SHORT.late_minor,
    label: "Late Minor",
    status: "late_minor",
  },
  {
    code: ATTENDANCE_STATUS_SHORT.late_major,
    label: "Late Major",
    status: "late_major",
  },
  {
    code: ATTENDANCE_STATUS_SHORT.work_from_home,
    label: "Work from Home",
    status: "work_from_home",
  },
  {
    code: ATTENDANCE_STATUS_SHORT.half_leave,
    label: "Half Leave",
    status: "half_leave",
  },
  { code: ATTENDANCE_STATUS_SHORT.leave, label: "Leave", status: "leave" },
  { code: ATTENDANCE_STATUS_SHORT.absent, label: "Absent", status: "absent" },
  {
    code: ATTENDANCE_STATUS_SHORT.holiday,
    label: "Holiday",
    status: "holiday",
  },
  {
    code: ATTENDANCE_STATUS_SHORT.weekly_off,
    label: "Weekly Off",
    status: "weekly_off",
  },
];

export function AttendanceLegend({
  showHolidayHint = false,
}: {
  showHolidayHint?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          aria-label="Attendance legend"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Legend</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {LEGEND_ITEMS.map(({ code, label, status }) => (
            <div key={code} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold",
                  status === "weekly_off"
                    ? "bg-muted text-muted-foreground"
                    : cellColorClass(status),
                )}
              >
                {code}
              </span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        {showHolidayHint && (
          <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            Click a date header to mark holiday
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
