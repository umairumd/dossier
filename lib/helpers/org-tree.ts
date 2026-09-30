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

  // `path` holds the ancestors of the node being built. Supervisor data can
  // contain cycles (A supervises B, B supervises A); skipping any report
  // that is already an ancestor keeps the recursion finite.
  function toNode(emp: EmployeeListItem, path: Set<string>): OrgNode {
    const nextPath = new Set(path).add(emp.id);
    const reportIds = (reportsMap.get(emp.id) ?? []).filter(
      (id) => !nextPath.has(id) && empMap.has(id),
    );
    return {
      id: emp.id,
      full_name: emp.full_name,
      role: emp.role,
      designation: emp.designation,
      avatar_url: emp.avatar_url,
      department_names: emp.department_names,
      supervisor_ids: emp.supervisor_ids,
      reports: reportIds.map((id) => toNode(empMap.get(id)!, nextPath)),
    };
  }

  const rootEmployees = active
    .filter((e) => !hasSupervisor.has(e.id))
    .filter(
      (e) =>
        (reportsMap.get(e.id)?.length ?? 0) > 0 || e.supervisor_ids.length === 0,
    );

  const unsupervisedEmployees = active.filter(
    (e) =>
      !hasSupervisor.has(e.id) && (reportsMap.get(e.id)?.length ?? 0) === 0,
  );

  // Employees that belong to a pure cycle have a supervisor, so they never
  // qualify as a root or as unsupervised and would silently disappear.
  // Find everything reachable from the normal roots, then promote one
  // member of each leftover component to a root so it still renders.
  const reachable = new Set<string>();
  function markReachable(id: string) {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const childId of reportsMap.get(id) ?? []) {
      markReachable(childId);
    }
  }
  for (const e of [...rootEmployees, ...unsupervisedEmployees]) {
    markReachable(e.id);
  }

  const cycleRoots: EmployeeListItem[] = [];
  for (const e of active) {
    if (reachable.has(e.id)) continue;
    cycleRoots.push(e);
    markReachable(e.id);
  }

  const roots = [...rootEmployees, ...cycleRoots].map((e) =>
    toNode(e, new Set()),
  );
  const unsupervised = unsupervisedEmployees.map((e) => toNode(e, new Set()));

  return { roots, unsupervised };
}
