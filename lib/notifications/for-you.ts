import type { NotificationType } from "@/types/notification";

// How each notification behaves in For you. One place, so the hero and any
// later surface (notices, tasks) share the same order and rules.

export type ForYouGroup = "action" | "warning" | "news" | "other";

export const FOR_YOU_GROUP_RANK: Record<ForYouGroup, number> = {
  action: 0,
  warning: 1,
  news: 2,
  other: 3,
};

const GROUPS: Partial<Record<NotificationType, ForYouGroup>> = {
  leave_request_submitted: "action",
  report_deadline: "warning",
  attendance_fine: "warning",
  handbook_reminder: "warning",
  handbook_published: "news",
  task_due: "warning",
};

/** Rows that leave on their own (when handled, or at the end of the day). */
const STICKY: ReadonlySet<NotificationType> = new Set([
  "leave_request_submitted",
  "report_deadline",
  "handbook_reminder",
]);

export function forYouGroup(type: NotificationType): ForYouGroup {
  return GROUPS[type] ?? "other";
}

export function forYouDismissible(type: NotificationType): boolean {
  return !STICKY.has(type);
}

/** Day-only rows don't show a time: it's always today. */
export function forYouShowsTime(type: NotificationType): boolean {
  return type !== "birthday" && type !== "birthday_wish" && type !== "report_deadline";
}
