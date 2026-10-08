import type { ActivityEventType } from "@/types/activity";

export type ActivityCategory =
  | "people"
  | "attendance"
  | "reports"
  | "organization"
  | "settings";

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  people: "People",
  attendance: "Attendance & Leave",
  reports: "Reports",
  organization: "Departments & Templates",
  settings: "Settings",
};

export const EVENT_CATEGORY: Record<ActivityEventType, ActivityCategory> = {
  employee_invited: "people",
  employee_onboarded: "people",
  employee_edited: "people",
  employee_deactivated: "people",
  employee_reactivated: "people",
  employee_archived: "people",
  employee_restored: "people",
  department_assigned: "people",
  supervisor_assigned: "people",
  attendance_recorded: "attendance",
  leave_approved: "attendance",
  leave_rejected: "attendance",
  accrual_run: "attendance",
  shift_assigned: "attendance",
  report_submitted: "reports",
  report_commented: "reports",
  department_created: "organization",
  department_edited: "organization",
  department_archived: "organization",
  template_created: "organization",
  template_edited: "organization",
  template_archived: "organization",
  template_assigned: "organization",
  org_settings_changed: "settings",
};

// Minimal colour per kind of activity: a faint tint on the icon chip and the
// icon in the same hue. Text stays neutral.
export const CATEGORY_TONE: Record<ActivityCategory, string> = {
  reports:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300 dark:ring-emerald-300/20",
  people:
    "bg-sky-500/10 text-sky-700 ring-sky-600/20 dark:text-sky-300 dark:ring-sky-300/20",
  attendance:
    "bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-300 dark:ring-amber-300/20",
  organization:
    "bg-violet-500/10 text-violet-700 ring-violet-600/20 dark:text-violet-300 dark:ring-violet-300/20",
  settings: "bg-foreground/[0.05] text-foreground/70 ring-foreground/10",
};
