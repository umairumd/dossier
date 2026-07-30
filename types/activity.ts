export type ActivityType =
  | "invited"
  | "archived"
  | "department_created"
  | "report_submitted";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  label: string;
  timestamp: string;
  href?: string;
}
