import type { AttendanceStatus } from "@/types/attendance";

/**
 * Day-cell tones for the personal attendance calendar.
 * Leave uses amber (distinct from off/weekend muted) — aligned with the
 * dashboard activity strip, not the org-grid purple leave chips.
 */
export function calendarDayToneClass(
  status: AttendanceStatus | null,
): string {
  if (!status) {
    return "bg-muted/30 text-muted-foreground hover:bg-muted/50";
  }

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
      return "bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30";
    case "half_leave":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20";
    case "absent":
      return "bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30";
    case "weekly_off":
      return "bg-muted/50 text-muted-foreground hover:bg-muted/70";
    case "holiday":
      return "bg-teal-500/15 text-teal-600 dark:text-teal-400 hover:bg-teal-500/25";
  }
}
