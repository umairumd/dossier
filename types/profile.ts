export type UserRole = "employee" | "manager" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  created_at: string;
}
