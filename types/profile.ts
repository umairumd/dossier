export type UserRole = "owner" | "admin" | "manager" | "member";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  organization_id: string | null;
  department_ids: string[];
  supervisor_ids: string[];
  is_supervisor: boolean;
  is_active: boolean;
  created_at: string;
}
