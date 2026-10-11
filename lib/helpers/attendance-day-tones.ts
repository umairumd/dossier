import type { AttendanceStatus } from "@/types/attendance";

/**
 * Day-cell tones for every attendance surface: the team grid, the personal
 * calendar, cell popovers and the legend. One colour per meaning, from the
 * status tokens in globals.css (ok, warn, severe, danger, leave, info,
 * holiday).
 */
export function calendarDayToneClass(
  status: AttendanceStatus | null,
): string {
  if (!status) {
    return "bg-muted/30 text-muted-foreground hover:bg-muted/50";
  }

  switch (status) {
    case "present":
      return "bg-ok/15 text-ok hover:bg-ok/25";
    case "late_minor":
      return "bg-warn/15 text-warn hover:bg-warn/25";
    case "late_major":
      return "bg-severe/20 text-severe hover:bg-severe/30";
    case "work_from_home":
      return "bg-info/15 text-info hover:bg-info/25";
    case "leave":
      return "bg-leave/15 text-leave hover:bg-leave/25";
    case "half_leave":
      return "bg-leave/10 text-leave hover:bg-leave/20";
    case "absent":
      return "bg-danger/20 text-danger hover:bg-danger/30";
    case "weekly_off":
      return "bg-muted/50 text-muted-foreground hover:bg-muted/70";
    case "holiday":
      return "bg-holiday/15 text-holiday hover:bg-holiday/25";
  }
}
