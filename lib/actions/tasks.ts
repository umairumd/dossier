"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/helpers/activity-log";
import { isValidDateString } from "@/lib/helpers/dates";
import { notifyGrouped } from "@/lib/notifications/grouped";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { canAssignTo, canEditTask, canWorkOnTask, getTaskRights, type TaskRow } from "@/lib/tasks/rights";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/types/task";

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

function cleanLabels(labels: unknown): string[] {
  if (!Array.isArray(labels)) return [];
  return [
    ...new Set(
      labels
        .filter((label): label is string => typeof label === "string")
        .map((label) => label.trim().slice(0, 30))
        .filter(Boolean),
    ),
  ].slice(0, 6);
}

function revalidateTasks() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

async function context() {
  const me = await getCurrentProfile();
  if (!me?.organization_id || !me.is_active) return null;
  const rights = await getTaskRights(me);
  return { me, rights, orgId: me.organization_id, admin: createAdminClient() };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof context>>>;

async function loadTask(ctx: Ctx, taskId: string) {
  if (!isId(taskId)) return null;
  const { data: task } = await ctx.admin
    .from("tasks")
    .select("id, organization_id, title, status, owner_id, created_by, department_id, archived_at")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.organization_id !== ctx.orgId || task.archived_at) return null;
  const [{ data: helpers }, { data: steps }] = await Promise.all([
    ctx.admin.from("task_helpers").select("profile_id").eq("task_id", taskId),
    ctx.admin.from("task_steps").select("owner_id").eq("task_id", taskId),
  ]);
  const helperIds = (helpers ?? []).map((row) => row.profile_id as string);
  const stepOwnerIds = (steps ?? []).flatMap((row) => (row.owner_id ? [row.owner_id as string] : []));
  const row = task as TaskRow & { title: string; status: TaskStatus };
  return {
    task: row,
    helperIds,
    edit: canEditTask(ctx.rights, ctx.me.id, row),
    work: canWorkOnTask(ctx.rights, ctx.me.id, row, helperIds, stepOwnerIds),
  };
}

async function addEvent(ctx: Ctx, taskId: string, body: string, meta: Record<string, unknown> = {}) {
  await ctx.admin.from("task_updates").insert({
    task_id: taskId,
    author_id: ctx.me.id,
    kind: "event",
    body,
    meta,
  });
}

async function touch(ctx: Ctx, taskId: string, patch: Record<string, unknown>) {
  return ctx.admin
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", taskId);
}

async function notify(
  ctx: Ctx,
  recipients: (string | null | undefined)[],
  type: "task_assigned" | "task_commented" | "task_done" | "task_due",
  taskId: string,
  title: string,
  body: string | null,
) {
  const ids = [...new Set(recipients.filter((id): id is string => Boolean(id) && id !== ctx.me.id))];
  if (ids.length === 0) return;
  await notifyGrouped(ctx.admin, {
    orgId: ctx.orgId,
    recipientIds: ids,
    type,
    entityType: "task",
    entityId: taskId,
    title: (count) => (type === "task_commented" && count > 1 ? `${count} new comments on ${body ?? "a task"}` : title),
    body: () => body,
  });
}

/**
 * The board a task lands on when nobody picked one: the owner's department,
 * preferring one the person giving the task manages.
 */
async function boardFor(ctx: Ctx, profileId: string): Promise<string | null> {
  const { data } = await ctx.admin
    .from("profile_departments")
    .select("department_id")
    .eq("profile_id", profileId);
  const ids = (data ?? []).map((row) => row.department_id as string);
  return ids.find((id) => ctx.rights.managedDepartmentIds.has(id)) ?? ids[0] ?? null;
}

function canUseBoard(rights: Ctx["rights"], departmentId: string): boolean {
  return (
    rights.all ||
    rights.managedDepartmentIds.has(departmentId) ||
    rights.memberDepartmentIds.has(departmentId)
  );
}

export type CreateTaskInput = {
  title: string;
  detailsMd?: string;
  assigneeIds: string[];
  /** Several assignees: one task each, or the first leads and the rest help. */
  mode: "each" | "lead";
  openTo: { kind: "department" | "designation"; value: string }[];
  dueDate?: string | null;
  priority?: TaskPriority;
  labels?: string[];
  /** A board, null for none (a personal task), left out to pick one automatically. */
  departmentId?: string | null;
  steps?: string[];
};

export async function createTask(input: CreateTaskInput): Promise<Result<{ ids: string[] }>> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const { me, rights, admin, orgId } = ctx;

  const title = typeof input?.title === "string" ? input.title.trim() : "";
  if (!title) return { success: false, error: "Add a title." };
  if (title.length > 200) return { success: false, error: "Keep the title under 200 characters." };
  const detailsMd = typeof input.detailsMd === "string" ? input.detailsMd.trim().slice(0, 10000) : "";
  const dueDate = isValidDateString(input.dueDate) ? input.dueDate : null;
  const priority: TaskPriority = TASK_PRIORITIES.includes(input.priority as TaskPriority)
    ? (input.priority as TaskPriority)
    : "normal";
  const labels = cleanLabels(input.labels);
  const steps = (Array.isArray(input.steps) ? input.steps : [])
    .filter((step): step is string => typeof step === "string")
    .map((step) => step.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 30);

  const assigneeIds = [...new Set((Array.isArray(input.assigneeIds) ? input.assigneeIds : []).filter(isId))];
  const openTo = (Array.isArray(input.openTo) ? input.openTo : []).filter(
    (rule) =>
      rule &&
      (rule.kind === "department" || rule.kind === "designation") &&
      typeof rule.value === "string" &&
      rule.value.trim(),
  );

  if (assigneeIds.length === 0 && openTo.length === 0) {
    return { success: false, error: "Choose who it's for." };
  }
  for (const id of assigneeIds) {
    if (!canAssignTo(rights, id)) {
      return { success: false, error: "You can give tasks to yourself and your own team." };
    }
  }
  if (!rights.all) {
    for (const rule of openTo) {
      if (rule.kind !== "department" || !rights.managedDepartmentIds.has(rule.value)) {
        return { success: false, error: "You can open tasks to the departments you manage." };
      }
    }
  }
  if (assigneeIds.length > 0) {
    const { data: valid } = await admin
      .from("profiles")
      .select("id")
      .in("id", assigneeIds)
      .eq("organization_id", orgId)
      .eq("is_active", true);
    if ((valid ?? []).length !== assigneeIds.length) return { success: false, error: "Someone on the list can't take tasks." };
  }

  const explicitBoard = input.departmentId === undefined ? undefined : isId(input.departmentId) ? input.departmentId : null;
  if (explicitBoard && !canUseBoard(rights, explicitBoard)) {
    return { success: false, error: "You can only add tasks to your own department's board." };
  }
  const position = Date.now();
  const base = {
    organization_id: orgId,
    title,
    details_md: detailsMd,
    priority,
    labels,
    due_date: dueDate,
    created_by: me.id,
    position,
  };

  // Rows to create: one open task, one per person, or one led task.
  type Plan = { owner: string | null; helpers: string[] };
  const plans: Plan[] =
    assigneeIds.length === 0
      ? [{ owner: null, helpers: [] }]
      : input.mode === "each"
        ? assigneeIds.map((id) => ({ owner: id, helpers: [] }))
        : [{ owner: assigneeIds[0], helpers: assigneeIds.slice(1) }];
  const groupId = plans.length > 1 ? crypto.randomUUID() : null;

  const ids: string[] = [];
  for (const plan of plans) {
    // Your own to-dos stay personal unless you put them on a board.
    const board =
      explicitBoard !== undefined
        ? explicitBoard
        : plan.owner === me.id && plan.helpers.length === 0
          ? null
          : plan.owner
            ? await boardFor(ctx, plan.owner)
            : (openTo.find((rule) => rule.kind === "department")?.value ?? null);
    const { data: inserted, error } = await admin
      .from("tasks")
      .insert({ ...base, owner_id: plan.owner, department_id: board, group_id: groupId })
      .select("id")
      .single();
    if (error || !inserted) {
      return { success: false, error: ids.length ? "Some tasks couldn't be created." : "Couldn't create the task." };
    }
    ids.push(inserted.id);
    const writes: PromiseLike<unknown>[] = [];
    if (plan.owner === null && openTo.length > 0) {
      writes.push(
        admin.from("task_audiences").insert(
          openTo.map((rule) => ({ task_id: inserted.id, kind: rule.kind, value: rule.value.trim() })),
        ),
      );
    }
    if (plan.helpers.length > 0) {
      writes.push(
        admin.from("task_helpers").insert(plan.helpers.map((id) => ({ task_id: inserted.id, profile_id: id }))),
      );
    }
    if (steps.length > 0) {
      writes.push(
        admin
          .from("task_steps")
          .insert(steps.map((step, index) => ({ task_id: inserted.id, title: step, position: index + 1 }))),
      );
    }
    writes.push(
      admin.from("task_updates").insert({
        task_id: inserted.id,
        author_id: me.id,
        kind: "event",
        body: "created this task",
        meta: { event: "created" },
      }),
    );
    await Promise.all(writes);

    const author = me.full_name?.trim() || "Someone";
    await notify(ctx, [plan.owner], "task_assigned", inserted.id, `${author} gave you a task`, title);
    await notify(ctx, plan.helpers, "task_assigned", inserted.id, `${author} asked you to help with a task`, title);
  }

  const singleOwner = plans.length === 1 && plans[0].owner && plans[0].owner !== me.id ? plans[0].owner : null;
  let targetName: string | undefined;
  if (singleOwner) {
    const { data } = await admin.from("profiles").select("full_name").eq("id", singleOwner).maybeSingle();
    targetName = data?.full_name ?? undefined;
  }
  await logActivity({
    orgId,
    eventType: "task_created",
    actorId: me.id,
    actorName: me.full_name,
    targetId: singleOwner ?? undefined,
    targetName,
    entityType: "task",
    entityId: ids[0],
    entityName: title,
    metadata: plans.length > 1 ? { count: plans.length } : undefined,
  });

  revalidateTasks();
  return { success: true, ids };
}

export type TaskPatch = {
  title?: string;
  detailsMd?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  labels?: string[];
  ownerId?: string | null;
  helperIds?: string[];
  departmentId?: string | null;
};

export async function updateTask(taskId: string, patch: TaskPatch): Promise<Result> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const loaded = await loadTask(ctx, taskId);
  if (!loaded) return { success: false, error: "Task not found." };
  if (!loaded.edit) return { success: false, error: "You can't change this task." };
  const { task } = loaded;

  const update: Record<string, unknown> = {};
  const events: string[] = [];
  if (patch.title !== undefined) {
    const title = String(patch.title).trim();
    if (!title || title.length > 200) return { success: false, error: "Titles are 1 to 200 characters." };
    if (title !== task.title) {
      update.title = title;
      events.push("renamed the task");
    }
  }
  if (patch.detailsMd !== undefined) {
    update.details_md = String(patch.detailsMd).trim().slice(0, 10000);
    events.push("edited the details");
  }
  if (patch.dueDate !== undefined) {
    const due = isValidDateString(patch.dueDate) ? patch.dueDate : null;
    update.due_date = due;
    const pretty = due
      ? new Date(`${due}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      : null;
    events.push(pretty ? `set the due date to ${pretty}` : "removed the due date");
  }
  if (patch.priority !== undefined && TASK_PRIORITIES.includes(patch.priority)) {
    update.priority = patch.priority;
    events.push(`set the priority to ${patch.priority}`);
  }
  if (patch.departmentId !== undefined) {
    const board = isId(patch.departmentId) ? patch.departmentId : null;
    if (board && !canUseBoard(ctx.rights, board)) {
      return { success: false, error: "You can only move tasks to your own department's board." };
    }
    if (board !== task.department_id) {
      update.department_id = board;
      if (board) {
        const { data: dept } = await ctx.admin.from("departments").select("name").eq("id", board).maybeSingle();
        events.push(`moved it to the ${dept?.name ?? "department"} board`);
      } else {
        events.push("took it off the board");
      }
    }
  }
  if (patch.labels !== undefined) {
    update.labels = cleanLabels(patch.labels);
    events.push("changed the labels");
  }

  let newOwner: string | null | undefined;
  if (patch.ownerId !== undefined) {
    newOwner = isId(patch.ownerId) ? patch.ownerId : null;
    if (newOwner && !canAssignTo(ctx.rights, newOwner)) {
      return { success: false, error: "You can give tasks to yourself and your own team." };
    }
    if (newOwner !== task.owner_id) {
      update.owner_id = newOwner;
      events.push(newOwner ? "changed who owns it" : "made it open to take");
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await touch(ctx, taskId, update);
    if (error) return { success: false, error: "Couldn't save that." };
  }

  if (patch.helperIds !== undefined) {
    const helperIds = [...new Set(patch.helperIds.filter(isId))].filter((id) => id !== (newOwner ?? task.owner_id));
    for (const id of helperIds) {
      if (!canAssignTo(ctx.rights, id)) return { success: false, error: "Helpers must be on your team." };
    }
    const added = helperIds.filter((id) => !loaded.helperIds.includes(id));
    const removed = loaded.helperIds.filter((id) => !helperIds.includes(id));
    if (added.length || removed.length) {
      const { data: named } = await ctx.admin
        .from("profiles")
        .select("id, full_name")
        .in("id", [...added, ...removed]);
      const nameOf = (id: string) => named?.find((row) => row.id === id)?.full_name ?? "someone";
      for (const id of added) events.push(`added ${nameOf(id)} to help`);
      for (const id of removed) events.push(`removed ${nameOf(id)} from helping`);
    }
    await ctx.admin.from("task_helpers").delete().eq("task_id", taskId);
    if (helperIds.length) {
      await ctx.admin.from("task_helpers").insert(helperIds.map((id) => ({ task_id: taskId, profile_id: id })));
    }
    const author = ctx.me.full_name?.trim() || "Someone";
    await notify(ctx, added, "task_assigned", taskId, `${author} asked you to help with a task`, String(update.title ?? task.title));
  }

  for (const body of events) await addEvent(ctx, taskId, body);
  if (newOwner) {
    const author = ctx.me.full_name?.trim() || "Someone";
    await notify(ctx, [newOwner], "task_assigned", taskId, `${author} gave you a task`, String(update.title ?? task.title));
  }
  revalidateTasks();
  return { success: true };
}

async function applyStatus(
  ctx: Ctx,
  loaded: NonNullable<Awaited<ReturnType<typeof loadTask>>>,
  status: TaskStatus,
  extra: Record<string, unknown> = {},
  options: { reason?: string | null; silentEvent?: boolean } = {},
) {
  const { task } = loaded;
  const changed = status !== task.status;
  const patch: Record<string, unknown> = { ...extra };
  if (changed) {
    patch.status = status;
    patch.done_at = status === "done" ? new Date().toISOString() : null;
  }
  if (status === "blocked") patch.blocked_reason = options.reason?.trim().slice(0, 300) || null;
  else if (changed) patch.blocked_reason = null;
  if (Object.keys(patch).length === 0) return { error: null };
  const { error } = await touch(ctx, task.id, patch);
  if (error || !changed) return { error };

  if (!options.silentEvent) {
    await addEvent(ctx, task.id, `moved it to ${TASK_STATUS_LABELS[status]}`, { event: "status", status, from: task.status });
  }
  if (status === "done") {
    const author = ctx.me.full_name?.trim() || "Someone";
    await notify(ctx, [task.created_by], "task_done", task.id, `${author} finished a task`, task.title);
    await logActivity({
      orgId: ctx.orgId,
      eventType: "task_completed",
      actorId: ctx.me.id,
      actorName: ctx.me.full_name,
      entityType: "task",
      entityId: task.id,
      entityName: task.title,
    });
  }
  return { error: null };
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
  reason?: string | null,
): Promise<Result> {
  if (!TASK_STATUSES.includes(status)) return { success: false, error: "Unknown status." };
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const loaded = await loadTask(ctx, taskId);
  if (!loaded) return { success: false, error: "Task not found." };
  if (!loaded.work) return { success: false, error: "You can't change this task." };
  const { error } = await applyStatus(ctx, loaded, status, {}, { reason });
  if (error) return { success: false, error: "Couldn't save that." };
  revalidateTasks();
  return { success: true };
}

/** Drag on a board: new column and position. */
export async function moveTask(taskId: string, status: TaskStatus, position: number): Promise<Result> {
  if (!TASK_STATUSES.includes(status) || !Number.isFinite(position)) return { success: false, error: "Couldn't move it." };
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const loaded = await loadTask(ctx, taskId);
  if (!loaded) return { success: false, error: "Task not found." };
  if (!loaded.work) return { success: false, error: "You can't move this task." };
  const { error } = await applyStatus(ctx, loaded, status, { position });
  if (error) return { success: false, error: "Couldn't move it." };
  revalidateTasks();
  return { success: true };
}

export async function claimTask(taskId: string): Promise<Result> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  if (!isId(taskId)) return { success: false, error: "Task not found." };
  const { data: task } = await ctx.admin
    .from("tasks")
    .select("id, organization_id, owner_id, title, created_by, archived_at")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.organization_id !== ctx.orgId || task.archived_at) return { success: false, error: "Task not found." };
  if (task.owner_id) return { success: false, error: "Someone already took it." };
  const { data: rules } = await ctx.admin.from("task_audiences").select("kind, value").eq("task_id", taskId);
  const designation = (ctx.me.designation ?? "").trim().toLowerCase();
  const eligible = (rules ?? []).some(
    (rule) =>
      (rule.kind === "department" && (ctx.me.department_ids ?? []).includes(rule.value)) ||
      (rule.kind === "designation" && rule.value.trim().toLowerCase() === designation),
  );
  if (!eligible) return { success: false, error: "This task isn't open to you." };
  // Only claim if still unowned, so two people can't both take it.
  const { data: claimed } = await ctx.admin
    .from("tasks")
    .update({ owner_id: ctx.me.id, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .is("owner_id", null)
    .select("id");
  if (!claimed || claimed.length === 0) return { success: false, error: "Someone already took it." };
  await addEvent(ctx, taskId, "took this task", { event: "claimed" });
  const author = ctx.me.full_name?.trim() || "Someone";
  await notify(ctx, [task.created_by], "task_assigned", taskId, `${author} took your task`, task.title);
  revalidateTasks();
  return { success: true };
}

export async function archiveTask(taskId: string): Promise<Result> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const loaded = await loadTask(ctx, taskId);
  if (!loaded) return { success: false, error: "Task not found." };
  if (!loaded.edit) return { success: false, error: "You can't archive this task." };
  const { error } = await touch(ctx, taskId, { archived_at: new Date().toISOString() });
  if (error) return { success: false, error: "Couldn't archive it." };
  revalidateTasks();
  return { success: true };
}

export async function addTaskComment(taskId: string, body: string): Promise<Result> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return { success: false, error: "Write something first." };
  if (text.length > 5000) return { success: false, error: "Keep it under 5,000 characters." };
  const loaded = await loadTask(ctx, taskId);
  if (!loaded) return { success: false, error: "Task not found." };
  // Anyone who can see the task can comment on it.
  const supabase = await createClient();
  const { data: visible } = await supabase.from("tasks").select("id").eq("id", taskId).maybeSingle();
  if (!visible) return { success: false, error: "Task not found." };
  const { error } = await ctx.admin
    .from("task_updates")
    .insert({ task_id: taskId, author_id: ctx.me.id, kind: "comment", body: text });
  if (error) return { success: false, error: "Couldn't post that." };
  const author = ctx.me.full_name?.trim() || "Someone";
  await notify(
    ctx,
    [loaded.task.owner_id, loaded.task.created_by, ...loaded.helperIds],
    "task_commented",
    taskId,
    `${author} commented on ${loaded.task.title}`,
    loaded.task.title,
  );
  revalidateTasks();
  return { success: true };
}

export async function addTaskStep(taskId: string, title: string): Promise<Result> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const text = typeof title === "string" ? title.trim().slice(0, 200) : "";
  if (!text) return { success: false, error: "Name the subtask." };
  const loaded = await loadTask(ctx, taskId);
  if (!loaded?.work) return { success: false, error: "You can't change this task." };
  const { error } = await ctx.admin
    .from("task_steps")
    .insert({ task_id: taskId, title: text, position: Date.now() });
  if (error) return { success: false, error: "Couldn't add the subtask." };
  await addEvent(ctx, taskId, `added the subtask “${text}”`, { event: "subtask" });
  await touch(ctx, taskId, {});
  revalidateTasks();
  return { success: true };
}

async function loadStep(ctx: Ctx, stepId: string) {
  if (!isId(stepId)) return null;
  const { data: step } = await ctx.admin
    .from("task_steps")
    .select("id, task_id, title, done, owner_id")
    .eq("id", stepId)
    .maybeSingle();
  if (!step) return null;
  const loaded = await loadTask(ctx, step.task_id);
  return loaded ? { step, ...loaded } : null;
}

export async function toggleTaskStep(stepId: string, done: boolean): Promise<Result> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const loaded = await loadStep(ctx, stepId);
  if (!loaded?.work) return { success: false, error: "You can't change this subtask." };
  const { error } = await ctx.admin
    .from("task_steps")
    .update({ done: Boolean(done), done_at: done ? new Date().toISOString() : null })
    .eq("id", stepId);
  if (error) return { success: false, error: "Couldn't save that." };
  if (Boolean(done) !== loaded.step.done) {
    await addEvent(
      ctx,
      loaded.step.task_id,
      done ? `finished the subtask “${loaded.step.title}”` : `reopened the subtask “${loaded.step.title}”`,
      { event: "subtask" },
    );
  }
  await touch(ctx, loaded.step.task_id, {});
  revalidateTasks();
  return { success: true };
}

export async function updateTaskStep(
  stepId: string,
  patch: { title?: string; ownerId?: string | null; dueDate?: string | null },
): Promise<Result> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const loaded = await loadStep(ctx, stepId);
  if (!loaded?.work) return { success: false, error: "You can't change this subtask." };
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const title = String(patch.title).trim().slice(0, 200);
    if (!title) return { success: false, error: "Name the subtask." };
    update.title = title;
  }
  if (patch.ownerId !== undefined) {
    const owner = isId(patch.ownerId) ? patch.ownerId : null;
    if (owner && !canAssignTo(ctx.rights, owner) && owner !== loaded.task.owner_id && !loaded.helperIds.includes(owner)) {
      return { success: false, error: "Subtasks can go to people on the task or your team." };
    }
    update.owner_id = owner;
    if (owner && owner !== loaded.step.owner_id) {
      const author = ctx.me.full_name?.trim() || "Someone";
      await notify(ctx, [owner], "task_assigned", loaded.task.id, `${author} gave you a subtask`, loaded.step.title);
      const { data: person } = await ctx.admin.from("profiles").select("full_name").eq("id", owner).maybeSingle();
      await addEvent(ctx, loaded.task.id, `gave the subtask “${loaded.step.title}” to ${person?.full_name ?? "someone"}`, { event: "subtask" });
    }
  }
  if (patch.dueDate !== undefined) update.due_date = isValidDateString(patch.dueDate) ? patch.dueDate : null;
  if (Object.keys(update).length === 0) return { success: true };
  const { error } = await ctx.admin.from("task_steps").update(update).eq("id", stepId);
  if (error) return { success: false, error: "Couldn't save that." };
  revalidateTasks();
  return { success: true };
}

export async function deleteTaskStep(stepId: string): Promise<Result> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  const loaded = await loadStep(ctx, stepId);
  if (!loaded?.work) return { success: false, error: "You can't change this subtask." };
  const { error } = await ctx.admin.from("task_steps").delete().eq("id", stepId);
  if (error) return { success: false, error: "Couldn't remove it." };
  await addEvent(ctx, loaded.step.task_id, `removed the subtask “${loaded.step.title}”`, { event: "subtask" });
  revalidateTasks();
  return { success: true };
}

export type ReportTaskUpdate = { taskId: string; status: TaskStatus; note: string };

/** Task updates written at the end of the daily report. Only the owner's tasks. */
export async function saveReportTaskUpdates(
  reportDate: string,
  updates: ReportTaskUpdate[],
): Promise<Result<{ saved: number }>> {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Not signed in." };
  if (!isValidDateString(reportDate) || !Array.isArray(updates)) return { success: false, error: "Nothing to save." };
  let saved = 0;
  for (const update of updates.slice(0, 50)) {
    if (!update || !TASK_STATUSES.includes(update.status)) continue;
    const loaded = await loadTask(ctx, update.taskId);
    if (!loaded || loaded.task.owner_id !== ctx.me.id) continue;
    const note = typeof update.note === "string" ? update.note.trim().slice(0, 2000) : "";
    const statusChanged = update.status !== loaded.task.status;
    if (!statusChanged && !note) continue;
    if (statusChanged) {
      await applyStatus(ctx, loaded, update.status, {}, { silentEvent: true, reason: update.status === "blocked" ? note : null });
    }
    await ctx.admin.from("task_updates").insert({
      task_id: loaded.task.id,
      author_id: ctx.me.id,
      kind: "report",
      body: note,
      meta: { status: update.status, from: loaded.task.status },
      report_date: reportDate,
    });
    if (!statusChanged) await touch(ctx, loaded.task.id, {});
    saved += 1;
  }
  if (saved > 0) revalidateTasks();
  return { success: true, saved };
}

export type ReportTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  stepsDone: number;
  stepsTotal: number;
};

/** The signed-in person's open tasks, for the end of the daily report. */
export async function listMyReportTasks(): Promise<ReportTask[]> {
  const { getMyOpenTasks } = await import("@/lib/supabase/queries/tasks");
  const tasks = await getMyOpenTasks();
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    dueDate: task.dueDate,
    stepsDone: task.stepsDone,
    stepsTotal: task.stepsTotal,
  }));
}

/** Task notes from someone's daily report, for whoever is reading it (RLS decides). */
export async function getReportTaskNotes(
  authorId: string,
  reportDate: string,
): Promise<{ taskId: string; title: string; status: string | null; body: string }[]> {
  const me = await getCurrentProfile();
  if (!me || !isId(authorId) || !isValidDateString(reportDate)) return [];
  const { getReportTaskUpdates } = await import("@/lib/supabase/queries/tasks");
  return getReportTaskUpdates(authorId, reportDate);
}

/** The full task for the task window, fetched when it opens. */
export async function loadTaskDetail(taskId: string) {
  if (!isId(taskId)) return null;
  const { getTaskDetail } = await import("@/lib/supabase/queries/tasks");
  return getTaskDetail(taskId);
}
