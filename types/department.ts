export interface DepartmentListItem {
  id: string;
  name: string;
  organization_id: string | null;
  manager_id: string | null;
  manager_name: string | null;
  employee_count: number;
  archived_at: string | null;
  created_at: string;
}

export interface ManagerCandidate {
  id: string;
  full_name: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
}
