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
