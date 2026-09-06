"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { saveAttendanceRecordAction } from "@/lib/actions/admin/attendance";
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
const NEEDS_CHECKIN: AttendanceStatus[] = ["late_minor", "late_major"];

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
      return "bg-primary/10 text-primary hover:bg-primary/20";
    case "late_minor":
      return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/25";
    case "late_major":
      return "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25";
    case "work_from_home":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25";
    case "leave":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25";
    case "half_leave":
      return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
    case "absent":
      return "bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30";
    case "weekly_off":
      return "bg-muted/50 text-muted-foreground hover:bg-muted/70";
    case "holiday":
      return "bg-muted/50 text-muted-foreground hover:bg-muted/70";
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

  const currentStatus = existingRecord?.status ?? null;
  const shortCode = currentStatus
    ? ATTENDANCE_STATUS_SHORT[currentStatus]
    : "—";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 w-full items-center justify-center rounded text-xs font-medium transition-colors",
            cellColorClass(currentStatus),
          )}
        >
          {shortCode}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="center">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium">{employeeName}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as AttendanceStatus)}
            >
              <SelectTrigger>
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

          {showCheckIn && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="check-in-time">Check-in Time</Label>
              <Input
                id="check-in-time"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {(fine > 0 || leaveDeducted > 0) && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {fine > 0 && <p>Fine: PKR {fine}</p>}
              {leaveDeducted > 0 && (
                <p>
                  Leave deducted: {leaveDeducted} day
                  {leaveDeducted !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes..."
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
