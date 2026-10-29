import type { TaskStatus } from "@/types/task";

export type DueTone = "overdue" | "soon" | "normal" | "none";

/** "Due tomorrow" in amber, overdue in red. Dates are org-local YYYY-MM-DD. */
export function dueInfo(
  dueDate: string | null,
  today: string,
  status?: TaskStatus,
): { label: string; tone: DueTone } {
  if (!dueDate) return { label: "No date", tone: "none" };
  const days = Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  const short = new Date(`${dueDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (status === "done") return { label: short, tone: "normal" };
  if (days < -1) return { label: `${-days} days late`, tone: "overdue" };
  if (days === -1) return { label: "1 day late", tone: "overdue" };
  if (days === 0) return { label: "Due today", tone: "soon" };
  if (days === 1) return { label: "Due tomorrow", tone: "soon" };
  if (days < 7) {
    const weekday = new Date(`${dueDate}T00:00:00Z`).toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    });
    return { label: weekday, tone: "normal" };
  }
  return { label: short, tone: "normal" };
}

export const DUE_TONE_CLASS: Record<DueTone, string> = {
  overdue: "text-danger",
  soon: "text-warn",
  normal: "text-muted-foreground",
  none: "text-muted-foreground",
};

export const STATUS_TONE_CLASS: Record<TaskStatus, string> = {
  todo: "bg-fill-active text-muted-foreground",
  in_progress: "bg-info/15 text-info",
  blocked: "bg-danger/15 text-danger",
  done: "bg-ok/15 text-ok",
};
