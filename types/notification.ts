export type NotificationType =
  | "leave_approved"
  | "leave_rejected"
  | "report_deadline"
  | "employee_invited"
  | "employee_onboarded"
  | "attendance_fine"
  | "leave_request_submitted"
  | "shift_assigned"
  | "template_assigned"
  | "supervisor_assigned"
  | "employee_deactivated"
  | "employee_archived"
  | "birthday"
  | "report_commented"
  | "leave_balance_adjusted"
  | "team_report_commented"
  | "profile_updated";

export interface Notification {
  id: string;
  org_id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  /** Set when the person follows or dismisses the For you row. Null means it still shows. */
  cleared_at: string | null;
  created_at: string;
}
