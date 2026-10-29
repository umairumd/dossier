import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/profile";

// Who may do what with tasks. Server only (not a "use server" file).
//   Owners and admins: anything.
//   Managers: give tasks to people in departments they manage, or open them
//     to those departments; manage their team's tasks.
//   Supervisors: the same for their supervisees.
//   Everyone: tasks for themselves.

export type TaskRights = {
  all: boolean;
  /** People this person can give tasks to (always includes themselves). */
  assignableIds: Set<string>;
  /** Departments this person manages. */
  managedDepartmentIds: Set<string>;
  /** Departments this person belongs to. */
  memberDepartmentIds: Set<string>;
};

export async function getTaskRights(me: Profile): Promise<TaskRights> {
  const all = me.role === "owner" || me.role === "admin";
  const admin = createAdminClient();
  const [{ data: managed }, { data: supervised }] = await Promise.all([
    admin.from("departments").select("id").eq("manager_id", me.id).is("archived_at", null),
    admin.from("member_supervisors").select("member_id").eq("supervisor_id", me.id),
  ]);
  const managedDepartmentIds = new Set((managed ?? []).map((row) => row.id as string));
  const { data: members } = managedDepartmentIds.size
    ? await admin
        .from("profile_departments")
        .select("profile_id")
        .in("department_id", [...managedDepartmentIds])
    : { data: [] as { profile_id: string }[] };
  const assignableIds = new Set<string>([
    me.id,
    ...(members ?? []).map((row) => row.profile_id as string),
    ...(supervised ?? []).map((row) => row.member_id as string),
  ]);
  return {
    all,
    assignableIds,
    managedDepartmentIds,
    memberDepartmentIds: new Set(me.department_ids ?? []),
  };
}

export function canAssignTo(rights: TaskRights, profileId: string): boolean {
  return rights.all || rights.assignableIds.has(profileId);
}

export type TaskRow = {
  id: string;
  organization_id: string;
  owner_id: string | null;
  created_by: string | null;
  department_id: string | null;
};

/** Edit the task itself: title, details, owner, dates, archive. */
export function canEditTask(rights: TaskRights, meId: string, task: TaskRow): boolean {
  if (rights.all || task.created_by === meId) return true;
  if (task.owner_id && task.owner_id !== meId && rights.assignableIds.has(task.owner_id)) return true;
  if (task.department_id && rights.managedDepartmentIds.has(task.department_id)) return true;
  return false;
}

/** Move it along: status, steps, comments. */
export function canWorkOnTask(
  rights: TaskRights,
  meId: string,
  task: TaskRow,
  helperIds: string[],
  stepOwnerIds: string[],
): boolean {
  return (
    canEditTask(rights, meId, task) ||
    task.owner_id === meId ||
    helperIds.includes(meId) ||
    stepOwnerIds.includes(meId)
  );
}
