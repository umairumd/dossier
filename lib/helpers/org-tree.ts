import type { EmployeeListItem } from "@/types/employee";

export interface OrgNode {
  id: string;
  full_name: string;
  role: string;
  designation: string | null;
  avatar_url: string | null;
  department_names: string[];
  supervisor_ids: string[];
  reports: OrgNode[];
}

export interface DepartmentInfo {
  id: string;
  manager_id: string | null;
}

export function buildOrgTree(
  employees: EmployeeListItem[],
  departments?: DepartmentInfo[],
): {
  roots: OrgNode[];
  unsupervised: OrgNode[];
} {
  const active = employees.filter((e) => e.status === "active");
  const activeIds = new Set(active.map((e) => e.id));

  const deptManagerMap = new Map<string, string>();
  for (const dept of departments ?? []) {
    if (dept.manager_id) {
      deptManagerMap.set(dept.id, dept.manager_id);
    }
  }

  // map each supervisor to their direct reports
  const reportsMap = new Map<string, string[]>();

  function addReport(supervisorId: string, memberId: string) {
    if (supervisorId === memberId) return;
    const list = reportsMap.get(supervisorId) ?? [];
    if (!list.includes(memberId)) {
      list.push(memberId);
      reportsMap.set(supervisorId, list);
    }
  }

  for (const emp of active) {
    for (const supId of emp.supervisor_ids) {
      if (activeIds.has(supId)) {
        addReport(supId, emp.id);
      }
    }
  }

  // Nodes that have at least one supervisor in the active org
  const hasSupervisor = new Set<string>();
  for (const emp of active) {
    for (const supId of emp.supervisor_ids) {
      if (activeIds.has(supId)) {
        hasSupervisor.add(emp.id);
      }
    }
  }

  // Fallback: department manager as implicit supervisor
  for (const emp of active) {
    if (hasSupervisor.has(emp.id)) continue;

    for (const deptId of emp.department_ids) {
      const managerId = deptManagerMap.get(deptId);
      if (managerId && activeIds.has(managerId) && managerId !== emp.id) {
        addReport(managerId, emp.id);
        hasSupervisor.add(emp.id);
        break;
      }
    }
  }

  const empMap = new Map(active.map((e) => [e.id, e]));

  function toNode(emp: EmployeeListItem): OrgNode {
    const reportIds = reportsMap.get(emp.id) ?? [];
    return {
      id: emp.id,
      full_name: emp.full_name,
      role: emp.role,
      designation: emp.designation,
      avatar_url: emp.avatar_url,
      department_names: emp.department_names,
      supervisor_ids: emp.supervisor_ids,
      reports: reportIds.map((id) => toNode(empMap.get(id)!)),
    };
  }

  const roots = active
    .filter((e) => !hasSupervisor.has(e.id))
    .filter(
      (e) =>
        (reportsMap.get(e.id)?.length ?? 0) > 0 || e.supervisor_ids.length === 0,
    )
    .map(toNode);

  const unsupervised = active
    .filter(
      (e) =>
        !hasSupervisor.has(e.id) && (reportsMap.get(e.id)?.length ?? 0) === 0,
    )
    .map(toNode);

  return { roots, unsupervised };
}
