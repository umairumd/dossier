import {
  ATTENDANCE_STATUS_SHORT,
  type AttendanceStatus,
} from "@/types/attendance";
import { cellColorClass } from "./attendance-cell-popover";
import { cn } from "@/lib/utils";

export function AttendanceCell({
  status,
}: {
  status: AttendanceStatus | null;
}) {
  // Match RemoteDayCellVisual's OFF pill so on-site and remote Sundays
  // look identical (bg-muted + smaller muted type, not cellColorClass).
  if (status === "weekly_off") {
    return (
      <div className="flex h-8 w-full items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground/40">
        OFF
      </div>
    );
  }

  const shortCode = status ? ATTENDANCE_STATUS_SHORT[status] : "—";

  return (
    <div
      className={cn(
        "flex h-8 w-full items-center justify-center rounded text-xs font-medium",
        cellColorClass(status),
      )}
    >
      {shortCode}
    </div>
  );
}
