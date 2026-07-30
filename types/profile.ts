export type UserRole = "employee" | "manager" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
}
