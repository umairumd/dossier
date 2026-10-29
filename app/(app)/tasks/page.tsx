import { TasksView, type TasksViewMode } from "@/components/tasks/tasks-view";
import { todayInTimezone } from "@/lib/helpers/dates";
import { loadAudiencePool } from "@/lib/notices/server";
import { getTaskRights } from "@/lib/tasks/rights";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getDepartmentBoard,
  getMyTasks,
  getOpenTasksForMe,
  getMySubtasks,
  getTaskBoards,
  getTasksIAssigned,
} from "@/lib/supabase/queries/tasks";

export const metadata = { title: "Tasks" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, me, settings] = await Promise.all([
    searchParams,
    getCurrentProfile(),
    getOrganizationSettings(),
  ]);
  if (!me?.organization_id) return null;

  const view: TasksViewMode =
    one(params.view) === "team" ? "team" : one(params.view) === "assigned" ? "assigned" : "mine";
  const requested = one(params.layout);
  const layout = requested === "board" || requested === "list" ? requested : view === "team" ? "board" : "list";
  const by = one(params.by) === "person" ? "person" : "status";
  const taskId = one(params.task);

  const [rights, boards] = await Promise.all([getTaskRights(me), getTaskBoards()]);
  // The viewer's own department first, so Team opens on their board.
  const ownBoard = boards.find((board) => (me.department_ids ?? []).includes(board.id));
  const boardId =
    boards.find((board) => board.id === one(params.board))?.id ?? ownBoard?.id ?? boards[0]?.id ?? null;

  // Lists are small; loading all three keeps the tab counts honest.
  const [mine, open, subtasks, assigned, boardTasks, pool, { data: departmentRows }] = await Promise.all([
    getMyTasks(),
    getOpenTasksForMe(),
    getMySubtasks(),
    getTasksIAssigned(),
    boardId ? getDepartmentBoard(boardId) : Promise.resolve([]),
    loadAudiencePool(me.organization_id),
    createAdminClient().from("departments").select("id, name").is("archived_at", null).order("name"),
  ]);

  const assignable = pool
    .filter((person) => rights.all || rights.assignableIds.has(person.id))
    .map((person) => ({
      id: person.id,
      name: person.full_name,
      avatar: person.avatar,
      designation: person.designation,
      departmentIds: person.department_ids,
    }));
  const openToDepartments = (departmentRows ?? [])
    .filter((row) => rights.all || rights.managedDepartmentIds.has(row.id))
    .map((row) => ({ id: row.id as string, name: row.name as string }));
  const designations = rights.all
    ? [
        ...new Map(
          pool
            .map((person) => person.designation?.trim())
            .filter((value): value is string => Boolean(value))
            .map((value) => [value.toLowerCase(), value]),
        ).values(),
      ].sort((a, b) => a.localeCompare(b))
    : [];
  const canManageBoard =
    rights.all || (boardId != null && rights.managedDepartmentIds.has(boardId));

  return (
    <TasksView
      view={view}
      layout={layout}
      by={by}
      today={todayInTimezone(settings.timezone)}
      viewerId={me.id}
      mine={mine}
      openForMe={open}
      subtasks={subtasks}
      assigned={assigned}
      boards={boards}
      boardId={boardId}
      boardTasks={boardTasks}
      canManageBoard={canManageBoard}
      initialTaskId={taskId && UUID.test(taskId) ? taskId : null}
      compose={{
        people: assignable,
        departments: openToDepartments,
        designations,
        canOpenToGroups: rights.all || rights.managedDepartmentIds.size > 0,
        isTeamLead: rights.all || rights.assignableIds.size > 1,
        boards,
      }}
    />
  );
}
