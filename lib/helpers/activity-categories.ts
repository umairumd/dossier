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
  department_created: "organization",
  department_edited: "organization",
  department_archived: "organization",
  template_created: "organization",
  template_edited: "organization",
  template_archived: "organization",
  template_assigned: "organization",
  org_settings_changed: "settings",
};

export const CATEGORY_ICON_COLOR: Record<ActivityCategory, string> = {
  people: "text-blue-500",
  attendance: "text-amber-500",
  reports: "text-green-500",
  organization: "text-purple-500",
  settings: "text-muted-foreground",
};
