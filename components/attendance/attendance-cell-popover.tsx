"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAttendanceRecordAction, clearAttendanceAction } from "@/lib/actions/admin/attendance";
import { formatDate } from "@/lib/helpers/dates";
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_SHORT,
  type AttendanceRecord,
  type AttendanceSettings,
  type AttendanceStatus,
} from "@/types/attendance";
import { cn } from "@/lib/utils";

// Status options available for HR to set
const STATUS_OPTIONS: AttendanceStatus[] = [
  "present",
  "late_minor",
  "late_major",
  "work_from_home",
  "leave",
  "half_leave",
  "absent",
  "weekly_off",
  "holiday",
];

// Statuses where check-in time is relevant
const NEEDS_CHECKIN: AttendanceStatus[] = [
  "present",
  "late_minor",
  "late_major",
  "work_from_home",
];

const SHOW_FINE: AttendanceStatus[] = [
  "late_minor",
  "late_major",
  "absent",
];

const SHOW_LEAVE_DEDUCTION: AttendanceStatus[] = [
  "leave",
  "half_leave",
  "absent",
];

// Statuses that deduct from leave bank
const LEAVE_DEDUCTION: Partial<Record<AttendanceStatus, number>> = {
  leave: 1,
  half_leave: 0.5,
  absent: 1,
};

// Fine amounts per status
function computeFine(
  status: AttendanceStatus,
  settings: AttendanceSettings,
): number {
  if (status === "late_minor") return settings.fineLateAmount;
  if (status === "late_major") return settings.fineVeryLateAmount;
  if (status === "absent") return settings.fineUninformedAmount;
  return 0;
}

// Cell color classes per status
export function cellColorClass(status: AttendanceStatus | null): string {
  if (!status) return "bg-muted/30 text-muted-foreground hover:bg-muted/50";
  switch (status) {
    case "present":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25";
    case "late_minor":
      return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/25";
    case "late_major":
      return "bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/30";
    case "work_from_home":
      return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/25";
    case "leave":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25";
    case "half_leave":
      return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
    case "absent":
      return "bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30";
    case "weekly_off":
      return "bg-muted/50 text-muted-foreground hover:bg-muted/70";
    case "holiday":
      return "bg-teal-500/15 text-teal-600 dark:text-teal-400 hover:bg-teal-500/25";
  }
}

export function AttendanceCellPopover({
  profileId,
  orgId,
  date,
  employeeName,
  existingRecord,
  settings,
  isWeeklyOff,
}: {
  profileId: string;
  orgId: string;
  date: string; // YYYY-MM-DD
  employeeName: string;
  existingRecord: AttendanceRecord | null;
  settings: AttendanceSettings;
  isWeeklyOff: boolean;
}) {
  const defaultStatus: AttendanceStatus = isWeeklyOff
    ? "weekly_off"
    : "present";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>(
    existingRecord?.status ?? defaultStatus,
  );
  const [checkInTime, setCheckInTime] = useState(
    existingRecord?.check_in_time?.slice(0, 5) ?? "",
  );
  const [notes, setNotes] = useState(existingRecord?.notes ?? "");
  const [isPending, startTransition] = useTransition();

  const fine = computeFine(status, settings);
  const leaveDeducted = LEAVE_DEDUCTION[status] ?? 0;
  const showCheckIn = NEEDS_CHECKIN.includes(status);
  const showFine = SHOW_FINE.includes(status);
  const showLeaveDeduction = SHOW_LEAVE_DEDUCTION.includes(status);

  const handleCheckInNow = () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Parse shift start from settings (format: "HH:MM:SS")
    const shiftStart = settings.shiftFulltimeStart.slice(0, 5); // "HH:MM"
    const [shiftH, shiftM] = shiftStart.split(":").map(Number);
    const [curH, curM] = currentTime.split(":").map(Number);

    const shiftMinutes = shiftH * 60 + shiftM;
    const currentMinutes = curH * 60 + curM;
    const minutesLate = currentMinutes - shiftMinutes;

    let autoStatus: AttendanceStatus;
    if (minutesLate <= settings.graceMinutes) {
      autoStatus = "present";
    } else if (minutesLate <= 30) {
      autoStatus = "late_minor";
    } else {
      autoStatus = "late_major";
    }

    setStatus(autoStatus);
    setCheckInTime(currentTime);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveAttendanceRecordAction({
        profileId,
        orgId,
        date,
        status,
        checkInTime: showCheckIn && checkInTime ? checkInTime + ":00" : null,
        fineAmount: fine,
        leaveDeducted,
        notes: notes || null,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to save.");
        return;
      }
      toast.success("Attendance saved.");
      setOpen(false);
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      const result = await clearAttendanceAction(profileId, date);
      if (!result.success) {
        toast.error(result.error ?? "Failed to clear.");
        return;
      }
      toast.success("Attendance cleared.");
      setOpen(false);
    });
  };

  const currentStatus = existingRecord?.status ?? null;
  const isOffCell =
    (!existingRecord && isWeeklyOff) ||
    existingRecord?.status === "weekly_off";
  const shortCode = currentStatus
    ? ATTENDANCE_STATUS_SHORT[currentStatus]
    : "—";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 w-full items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isOffCell
              ? "bg-muted text-[10px] text-muted-foreground/40"
              : cn("text-xs", cellColorClass(currentStatus)),
            existingRecord?.notes && "border border-dashed border-foreground/40",
          )}
        >
          {isOffCell ? "OFF" : shortCode}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="center">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{employeeName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
            </div>
            {existingRecord && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
                disabled={isPending}
                aria-label="Clear attendance"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {showCheckIn && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleCheckInNow}
            >
              <Clock className="size-3.5" />
              Check In Now
            </Button>
          )}

          {showCheckIn ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as AttendanceStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ATTENDANCE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="check-in-time" className="text-xs">
                  Check-in
                </Label>
                <Input
                  id="check-in-time"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as AttendanceStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ATTENDANCE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(showFine || showLeaveDeduction) && (
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {showFine && <p>Fine: PKR {fine}</p>}
              {showLeaveDeduction && <p>Leave: {leaveDeducted}d</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              className="resize-none text-xs"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
