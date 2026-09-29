"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  clearAttendanceAction,
  fetchReportForAttendance,
  saveAttendanceRecordAction,
} from "@/lib/actions/admin/attendance";
import { formatDate } from "@/lib/helpers/dates";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type {
  AttendanceRecord,
  AttendanceStatus,
} from "@/types/attendance";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import { cn } from "@/lib/utils";
import { cellColorClass } from "./attendance-cell-popover";
import { AttendanceCell } from "./attendance-cell";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Mark Present (no report)" },
  { value: "leave", label: "Leave" },
  { value: "half_leave", label: "Half Leave" },
];

const LEAVE_DEDUCTION: Partial<Record<AttendanceStatus, number>> = {
  present: 0,
  leave: 1,
  half_leave: 0.5,
};

type SubmittedMember = TeamMemberReport & { report: DailyReport };

export function RemoteDayCellVisual({
  isOff,
  isFuture,
  isPast,
  record,
  hasReport,
}: {
  isOff: boolean;
  isFuture: boolean;
  isPast: boolean;
  record: AttendanceRecord | null;
  hasReport: boolean;
}) {
  const unsetClass = cn(
    "flex h-8 w-full items-center justify-center rounded text-xs font-medium",
    cellColorClass(null),
  );
  const transparentUnsetClass =
    "flex h-8 w-full items-center justify-center rounded text-xs text-muted-foreground/30";

  if (isFuture) {
    return <div className={transparentUnsetClass}>—</div>;
  }

  if (isOff && (!record || record.status === "weekly_off")) {
    return (
      <div className="flex h-8 w-full items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground/40">
        OFF
      </div>
    );
  }

  if (record?.status === "holiday") {
    return <AttendanceCell status="holiday" />;
  }

  if (record?.status === "leave" || record?.status === "half_leave") {
    return <AttendanceCell status={record.status} />;
  }

  if (hasReport) {
    return (
      <div
        className={cn(
          "flex h-8 w-full items-center justify-center rounded text-xs font-medium",
          cellColorClass("present"),
        )}
      >
        ✓
      </div>
    );
  }

  if (record?.status === "present") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-8 w-full items-center justify-center rounded bg-emerald-800/60 text-xs font-medium text-emerald-100">
              ✓
            </div>
          </TooltipTrigger>
          <TooltipContent>Manually marked present</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isOff) {
    return (
      <div className="flex h-8 w-full items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground/40">
        OFF
      </div>
    );
  }

  if (isPast && !record && !hasReport) {
    return (
      <div className={cn(unsetClass, "text-destructive/50")}>—</div>
    );
  }

  return <div className={transparentUnsetClass}>—</div>;
}

export function RemoteDayCellPopover({
  profileId,
  orgId,
  date,
  employeeName,
  designation,
  avatarUrl,
  isRemote,
  employmentType,
  existingRecord,
  hasReport,
  isPast,
  deadline,
  isReadOnly = false,
}: {
  profileId: string;
  orgId: string;
  date: string;
  employeeName: string;
  designation: string | null;
  avatarUrl: string | null;
  isRemote: boolean;
  employmentType: "full_time" | "part_time";
  existingRecord: AttendanceRecord | null;
  hasReport: boolean;
  isPast: boolean;
  deadline: DeadlineContext;
  isReadOnly?: boolean;
}) {
  const initialStatus =
    existingRecord?.status === "leave" ||
    existingRecord?.status === "half_leave" ||
    existingRecord?.status === "present"
      ? existingRecord.status
      : "";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [sheetMember, setSheetMember] = useState<SubmittedMember | null>(null);
  const [sheetIndex, setSheetIndex] = useState<number | null>(null);

  const handleSave = () => {
    if (
      status !== "present" &&
      status !== "leave" &&
      status !== "half_leave"
    ) {
      toast.error("Select a status.");
      return;
    }

    startTransition(async () => {
      const result = await saveAttendanceRecordAction({
        profileId,
        orgId,
        date,
        status,
        checkInTime: null,
        fineAmount: 0,
        leaveDeducted: LEAVE_DEDUCTION[status] ?? 0,
        notes: null,
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

  const handleViewReport = () => {
    startTransition(async () => {
      const result = await fetchReportForAttendance(profileId, date);
      if (!result.success || !result.report) {
        toast.error(result.error ?? "Failed to load report.");
        return;
      }

      setOpen(false);
      setSheetMember({
        employeeId: profileId,
        fullName: employeeName,
        designation,
        avatarUrl,
        isRemote,
        employment_type: employmentType,
        report: result.report,
      });
      setSheetIndex(0);
    });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full rounded bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RemoteDayCellVisual
              isOff={false}
              isFuture={false}
              isPast={isPast}
              record={existingRecord}
              hasReport={hasReport}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="center">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{employeeName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(date)}
                </p>
              </div>
              {existingRecord && !isReadOnly && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={handleClear}
                        disabled={isPending}
                        aria-label="Reset to default"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset to default</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {hasReport ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Report submitted
                </p>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isPending}
                    onClick={handleViewReport}
                  >
                    {isPending ? "Loading…" : "View Report"}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs font-medium text-destructive/70">
                No report submitted
              </p>
            )}

            {!isReadOnly && (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <Label className="text-xs">Status override</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Mark status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    disabled={isPending || !status}
                    onClick={handleSave}
                  >
                    {isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {sheetMember && (
        <ReportDetailSheet
          members={[sheetMember]}
          index={sheetIndex}
          onIndexChange={(next) => {
            setSheetIndex(next);
            if (next === null) {
              setSheetMember(null);
            }
          }}
          deadline={deadline}
          adminView
          showProfileLink={false}
        />
      )}
    </>
  );
}
