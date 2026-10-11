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
    "bg-ok/10 text-ok ring-ok/20",
  people:
    "bg-info/10 text-info ring-info/20",
  attendance:
    "bg-warn/10 text-warn ring-warn/20",
  organization:
    "bg-leave/10 text-leave ring-leave/20",
  settings: "bg-fill-hover text-foreground/70 ring-edge",
};
