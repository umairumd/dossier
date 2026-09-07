export type ActivityEventType =
  | "employee_invited"
  | "employee_onboarded"
  | "employee_edited"
  | "employee_deactivated"
  | "employee_reactivated"
  | "employee_archived"
  | "employee_restored"
  | "department_assigned"
  | "supervisor_assigned"
  | "template_assigned"
  | "shift_assigned"
  | "report_submitted"
  | "department_created"
  | "department_edited"
  | "department_archived"
  | "attendance_recorded"
  | "leave_approved"
  | "leave_rejected"
  | "accrual_run"
  | "org_settings_changed"
  | "template_created"
  | "template_edited"
  | "template_archived";

export interface ActivityLogEntry {
  id: string;
  org_id: string;
  event_type: ActivityEventType;
  actor_id: string | null;
  actor_name: string | null;
  target_id: string | null;
  target_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Keep ActivityItem for backward compat with any remaining usages
export interface ActivityItem {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  href?: string;
}
