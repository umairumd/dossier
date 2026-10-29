import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { canEditTask, canWorkOnTask, getTaskRights } from "@/lib/tasks/rights";
import type {
  TaskDetail,
  TaskOpenTo,
  TaskPerson,
  TaskPriority,
  TaskStatus,
  TaskStep,
  TaskSummary,
  TaskUpdate,
} from "@/types/task";

const TASK_SELECT =
  "id, organization_id, title, status, priority, labels, owner_id, department_id, group_id, due_date, blocked_reason, position, created_by, done_at, archived_at, created_at, updated_at";

export type TaskRowFull = {
  id: string;
  organization_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[] | null;
  owner_id: string | null;
  department_id: string | null;
  group_id: string | null;
  due_date: string | null;
  blocked_reason: string | null;
  position: number;
  created_by: string | null;
  done_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Names and avatars for people on tasks, read with the service role because
 * members can't read every profile; only ids already on visible tasks. */
async function loadPeople(ids: (string | null | undefined)[]): Promise<Map<string, TaskPerson>> {
  const unique = [...new Set(ids.filter(Boolean))] as string[];
  if (unique.length === 0) return new Map();
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, full_name, avatar, designation")
    .in("id", unique);
  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      { id: row.id, name: row.full_name, avatar: row.avatar, designation: row.designation },
    ]),
  );
}

async function loadDepartmentNames(): Promise<Map<string, string>> {
  const { data } = await createAdminClient().from("departments").select("id, name");
  return new Map((data ?? []).map((row) => [row.id as string, row.name as string]));
}

async function summarise(supabase: Supabase, rows: TaskRowFull[]): Promise<TaskSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [{ data: audiences }, { data: helpers }, { data: steps }, { data: comments }, departments] =
    await Promise.all([
      supabase.from("task_audiences").select("task_id, kind, value").in("task_id", ids),
      supabase.from("task_helpers").select("task_id, profile_id").in("task_id", ids),
      supabase.from("task_steps").select("task_id, done").in("task_id", ids),
      supabase.from("task_updates").select("task_id").eq("kind", "comment").in("task_id", ids),
      loadDepartmentNames(),
    ]);
  const people = await loadPeople(rows.flatMap((row) => [row.owner_id, row.created_by]));

  const group = <T extends { task_id: string }>(list: T[] | null) => {
    const map = new Map<string, T[]>();
    for (const item of list ?? []) {
      const bucket = map.get(item.task_id) ?? [];
      bucket.push(item);
      map.set(item.task_id, bucket);
    }
    return map;
  };
  const audiencesBy = group(audiences as { task_id: string; kind: "department" | "designation"; value: string }[] | null);
  const helpersBy = group(helpers as { task_id: string; profile_id: string }[] | null);
  const stepsBy = group(steps as { task_id: string; done: boolean }[] | null);
  const commentsBy = group(comments as { task_id: string }[] | null);

  return rows.map((row) => {
    const taskSteps = stepsBy.get(row.id) ?? [];
    const openTo: TaskOpenTo[] = (audiencesBy.get(row.id) ?? []).map((rule) => ({
      kind: rule.kind,
      value: rule.value,
      label: rule.kind === "department" ? (departments.get(rule.value) ?? "A department") : rule.value,
    }));
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      labels: row.labels ?? [],
      owner: row.owner_id ? (people.get(row.owner_id) ?? null) : null,
      openTo,
      departmentId: row.department_id,
      departmentName: row.department_id ? (departments.get(row.department_id) ?? null) : null,
      groupId: row.group_id,
      dueDate: row.due_date,
      blockedReason: row.blocked_reason,
      position: row.position,
      createdBy: row.created_by ? (people.get(row.created_by) ?? null) : null,
      doneAt: row.done_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      helperIds: (helpersBy.get(row.id) ?? []).map((helper) => helper.profile_id),
      stepsDone: taskSteps.filter((step) => step.done).length,
      stepsTotal: taskSteps.length,
      commentCount: (commentsBy.get(row.id) ?? []).length,
    };
  });
}

/** Done tasks stay on boards and lists for this many days. */
const DONE_WINDOW_DAYS = 7;

function doneCutoff(): string {
  return new Date(Date.now() - DONE_WINDOW_DAYS * 86_400_000).toISOString();
}

/** Open tasks the viewer owns or helps with, plus ones they finished this week. */
export const getMyTasks = cache(async (): Promise<TaskSummary[]> => {
  const me = await getCurrentProfile();
  if (!me) return [];
  const supabase = await createClient();
  const [{ data: helping }, { data: stepRows }] = await Promise.all([
    supabase.from("task_helpers").select("task_id").eq("profile_id", me.id),
    supabase.from("task_steps").select("task_id").eq("owner_id", me.id).eq("done", false),
  ]);
  const extraIds = [
    ...new Set([...(helping ?? []), ...(stepRows ?? [])].map((row) => row.task_id as string)),
  ];
  const orFilter = extraIds.length
    ? `owner_id.eq.${me.id},id.in.(${extraIds.join(",")})`
    : `owner_id.eq.${me.id}`;
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .is("archived_at", null)
    .or(orFilter)
    .or(`status.neq.done,done_at.gte.${doneCutoff()}`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(200);
  return summarise(supabase, (data ?? []) as TaskRowFull[]);
});

/** Tasks the viewer gave to other people. */
export const getTasksIAssigned = cache(async (): Promise<TaskSummary[]> => {
  const me = await getCurrentProfile();
  if (!me) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .is("archived_at", null)
    .eq("created_by", me.id)
    .or(`owner_id.is.null,owner_id.neq.${me.id}`)
    .or(`status.neq.done,done_at.gte.${doneCutoff()}`)
    .order("created_at", { ascending: false })
    .limit(200);
  return summarise(supabase, (data ?? []) as TaskRowFull[]);
});

/** A department's board: its tasks plus open tasks offered to it. */
export async function getDepartmentBoard(departmentId: string): Promise<TaskSummary[]> {
  const supabase = await createClient();
  const { data: offered } = await supabase
    .from("task_audiences")
    .select("task_id")
    .eq("kind", "department")
    .eq("value", departmentId);
  const offeredIds = (offered ?? []).map((row) => row.task_id as string);
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .is("archived_at", null)
    .or(
      offeredIds.length
        ? `department_id.eq.${departmentId},id.in.(${offeredIds.join(",")})`
        : `department_id.eq.${departmentId}`,
    )
    .or(`status.neq.done,done_at.gte.${doneCutoff()}`)
    .order("position", { ascending: true })
    .limit(400);
  return summarise(supabase, (data ?? []) as TaskRowFull[]);
}

/** Boards the viewer can open: their departments, ones they manage, or all. */
export const getTaskBoards = cache(async (): Promise<{ id: string; name: string }[]> => {
  const me = await getCurrentProfile();
  if (!me) return [];
  const rights = await getTaskRights(me);
  const { data } = await createAdminClient()
    .from("departments")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  return (data ?? [])
    .filter(
      (row) =>
        rights.all ||
        rights.memberDepartmentIds.has(row.id) ||
        rights.managedDepartmentIds.has(row.id),
    )
    .map((row) => ({ id: row.id as string, name: row.name as string }));
});

/** Open tasks for the daily report and For you (owned only). */
export const getMyOpenTasks = cache(async (): Promise<TaskSummary[]> => {
  const tasks = await getMyTasks();
  const me = await getCurrentProfile();
  return tasks.filter((task) => task.status !== "done" && task.owner?.id === me?.id);
});

export async function getTaskDetail(taskId: string): Promise<TaskDetail | null> {
  const me = await getCurrentProfile();
  if (!me) return null;
  const supabase = await createClient();
  // Everything keyed by the task id goes out at once; RLS still decides.
  const [{ data: row }, { data: helperRows }, { data: stepRows }, { data: updateRows }, rights] = await Promise.all([
    supabase.from("tasks").select(`${TASK_SELECT}, details_md`).eq("id", taskId).maybeSingle(),
    supabase.from("task_helpers").select("profile_id").eq("task_id", taskId),
    supabase
      .from("task_steps")
      .select("id, title, done, owner_id, due_date, position")
      .eq("task_id", taskId)
      .order("position"),
    supabase
      .from("task_updates")
      .select("id, kind, body, author_id, meta, report_date, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(200),
    getTaskRights(me),
  ]);
  if (!row) return null;
  const summaryPromise = summarise(supabase, [row as TaskRowFull]);
  const helperIds = (helperRows ?? []).map((h) => h.profile_id as string);
  const stepOwnerIds = (stepRows ?? []).flatMap((s) => (s.owner_id ? [s.owner_id as string] : []));
  const [[summary], people] = await Promise.all([
    summaryPromise,
    loadPeople([...helperIds, ...stepOwnerIds, ...(updateRows ?? []).map((u) => u.author_id as string | null)]),
  ]);
  const taskRow = row as TaskRowFull;
  const edit = canEditTask(rights, me.id, taskRow);
  const work = canWorkOnTask(rights, me.id, taskRow, helperIds, stepOwnerIds);
  const claim =
    !taskRow.owner_id &&
    summary.openTo.some(
      (rule) =>
        (rule.kind === "department" && (me.department_ids ?? []).includes(rule.value)) ||
        (rule.kind === "designation" &&
          rule.value.trim().toLowerCase() === (me.designation ?? "").trim().toLowerCase()),
    );
  const steps: TaskStep[] = (stepRows ?? []).map((step) => ({
    id: step.id,
    title: step.title,
    done: step.done,
    owner: step.owner_id ? (people.get(step.owner_id) ?? null) : null,
    dueDate: step.due_date,
    position: step.position,
  }));
  const updates: TaskUpdate[] = (updateRows ?? []).map((update) => ({
    id: update.id,
    kind: update.kind,
    body: update.body,
    author: update.author_id ? (people.get(update.author_id) ?? null) : null,
    meta: update.meta as Record<string, unknown> | null,
    reportDate: update.report_date,
    createdAt: update.created_at,
  }));
  return {
    ...summary,
    detailsMd: (row as { details_md: string }).details_md,
    helpers: helperIds.flatMap((id) => (people.get(id) ? [people.get(id)!] : [])),
    steps,
    updates,
    can: { edit, work, claim, archive: edit },
  };
}

/** Task notes written in someone's daily report, for Track Reports. */
export async function getReportTaskUpdates(
  authorId: string,
  reportDate: string,
): Promise<{ taskId: string; title: string; status: string | null; body: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_updates")
    .select("task_id, body, meta")
    .eq("author_id", authorId)
    .eq("report_date", reportDate)
    .eq("kind", "report");
  if (!data || data.length === 0) return [];
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title")
    .in(
      "id",
      data.map((row) => row.task_id as string),
    );
  const titleBy = new Map((tasks ?? []).map((task) => [task.id as string, task.title as string]));
  return data.flatMap((row) =>
    titleBy.has(row.task_id)
      ? [
          {
            taskId: row.task_id as string,
            title: titleBy.get(row.task_id)!,
            status: ((row.meta as { status?: string } | null)?.status ?? null) as string | null,
            body: row.body as string,
          },
        ]
      : [],
  );
}

/** Unowned tasks offered to this person's department or designation. */
export const getOpenTasksForMe = cache(async (): Promise<TaskSummary[]> => {
  const me = await getCurrentProfile();
  if (!me) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .is("archived_at", null)
    .is("owner_id", null)
    .neq("status", "done")
    .order("created_at", { ascending: false })
    .limit(50);
  const tasks = await summarise(supabase, (data ?? []) as TaskRowFull[]);
  const designation = (me.designation ?? "").trim().toLowerCase();
  return tasks.filter((task) =>
    task.openTo.some(
      (rule) =>
        (rule.kind === "department" && (me.department_ids ?? []).includes(rule.value)) ||
        (rule.kind === "designation" && rule.value.trim().toLowerCase() === designation),
    ),
  );
});

export type MySubtask = {
  id: string;
  title: string;
  dueDate: string | null;
  taskId: string;
  taskTitle: string;
  taskOwner: TaskPerson | null;
};

/** Open subtasks given to this person on tasks someone else owns. */
export const getMySubtasks = cache(async (): Promise<MySubtask[]> => {
  const me = await getCurrentProfile();
  if (!me) return [];
  const supabase = await createClient();
  const { data: steps } = await supabase
    .from("task_steps")
    .select("id, title, due_date, task_id")
    .eq("owner_id", me.id)
    .eq("done", false)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(50);
  if (!steps || steps.length === 0) return [];
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, owner_id, archived_at, status")
    .in("id", [...new Set(steps.map((step) => step.task_id as string))]);
  const taskBy = new Map(
    (tasks ?? [])
      .filter((task) => !task.archived_at && task.status !== "done" && task.owner_id !== me.id)
      .map((task) => [task.id as string, task]),
  );
  const people = await loadPeople([...taskBy.values()].map((task) => task.owner_id as string | null));
  return steps.flatMap((step) => {
    const task = taskBy.get(step.task_id);
    if (!task) return [];
    return [
      {
        id: step.id,
        title: step.title,
        dueDate: step.due_date,
        taskId: task.id,
        taskTitle: task.title,
        taskOwner: task.owner_id ? (people.get(task.owner_id) ?? null) : null,
      },
    ];
  });
});
