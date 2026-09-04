export interface DepartmentListItem {
  id: string;
  name: string;
  organization_id: string | null;
  manager_id: string | null;
  manager_name: string | null;
  employee_count: number;
  archived_at: string | null;
  created_at: string;
  template_id: string | null;
}

export interface ManagerCandidate {
  id: string;
  full_name: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  manager_name?: string | null;
}

export interface DepartmentMember {
  id: string;
  full_name: string;
  designation: string | null;
  is_remote: boolean;
  has_onboarded: boolean;
}

export interface DepartmentManager {
  id: string;
  full_name: string;
  designation: string | null;
}
