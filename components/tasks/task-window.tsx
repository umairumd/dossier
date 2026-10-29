"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, CircleDot, Link2, MoreHorizontal, Plus, Tag, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { RichEditor } from "@/components/shared/rich-editor";
import { RichText } from "@/components/shared/rich-text";
import { StatusPill, StepsBar } from "@/components/tasks/task-bits";
import { fetchTask, getCachedTask, setCachedTask } from "@/components/tasks/task-cache";
import {
  AssigneePicker,
  BoardPicker,
  DuePicker,
  PriorityPicker,
  PropertyChip,
  type PickPerson,
} from "@/components/tasks/task-pickers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addTaskComment,
  addTaskStep,
  archiveTask,
  claimTask,
  deleteTaskStep,
  setTaskStatus,
  toggleTaskStep,
  updateTask,
  updateTaskStep,
} from "@/lib/actions/tasks";
import { STATUS_TONE_CLASS } from "@/lib/tasks/format";
import { cn } from "@/lib/utils";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskDetail,
  type TaskPerson,
  type TaskStatus,
  type TaskSummary,
  type TaskUpdate,
} from "@/types/task";

type ActionResult = { success: true } | { success: false; error: string };

function ago(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (diff < 60_000) return "just now";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

// ---------------------------------------------------------------------------
// Activity

type TimelineItem =
  | { kind: "update"; update: TaskUpdate }
  | { kind: "statusRun"; id: string; author: TaskUpdate["author"]; count: number; final: string; at: string; items: TaskUpdate[] };

/** Status changes by one person within an hour fold into one line. */
function buildTimeline(updates: TaskUpdate[]): TimelineItem[] {
  const ordered = [...updates].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const out: TimelineItem[] = [];
  const same = (a: TaskUpdate["author"], b: TaskUpdate["author"]) => (a?.id ?? null) === (b?.id ?? null);
  for (const update of ordered) {
    const isStatus = update.kind === "event" && update.meta?.event === "status";
    const last = out[out.length - 1];
    const near = (iso: string) => Date.parse(update.createdAt) - Date.parse(iso) < 3_600_000;
    if (isStatus && last?.kind === "statusRun" && same(last.author, update.author) && near(last.at)) {
      last.count += 1;
      last.final = String(update.meta?.status ?? last.final);
      last.at = update.createdAt;
      last.items.push(update);
      continue;
    }
    const prev = last?.kind === "update" ? last.update : null;
    if (isStatus && prev?.kind === "event" && prev.meta?.event === "status" && same(prev.author, update.author) && near(prev.createdAt)) {
      out[out.length - 1] = {
        kind: "statusRun",
        id: prev.id,
        author: update.author,
        count: 2,
        final: String(update.meta?.status ?? ""),
        at: update.createdAt,
        items: [prev, update],
      };
      continue;
    }
    out.push({ kind: "update", update });
  }
  return out;
}

function Activity({
  updates,
  viewerId,
  filter,
}: {
  updates: TaskUpdate[];
  viewerId: string;
  filter: "all" | "comments";
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const items = useMemo(
    () => buildTimeline(filter === "all" ? updates : updates.filter((update) => update.kind !== "event")),
    [updates, filter],
  );
  const who = (author: TaskUpdate["author"]) => (author?.id === viewerId ? "You" : (author?.name ?? "Someone"));
  const event = (key: string, author: TaskUpdate["author"], at: string, text: ReactNode) => (
    <li key={key} className="flex gap-2 py-0.5 text-xs leading-5 text-muted-foreground">
      <span className="flex w-5 shrink-0 justify-center pt-2">
        <span className="size-1 rounded-full bg-line-strong" />
      </span>
      <p className="min-w-0 flex-1">
        <span className="text-foreground/80">{who(author)}</span> {text} <span className="whitespace-nowrap">· {ago(at)}</span>
      </p>
    </li>
  );
  if (items.length === 0) {
    return <p className="px-1 text-[13px] text-muted-foreground">No comments yet. Start the conversation below.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        if (item.kind === "statusRun") {
          if (expanded.includes(item.id)) return item.items.map((update) => event(update.id, update.author, update.createdAt, update.body));
          return event(
            item.id,
            item.author,
            item.at,
            <>
              changed the status {item.count} times, now {TASK_STATUS_LABELS[item.final as TaskStatus] ?? item.final}{" "}
              <button type="button" onClick={() => setExpanded((list) => [...list, item.id])} className="underline underline-offset-2 hover:text-foreground">
                Show
              </button>
            </>,
          );
        }
        const update = item.update;
        if (update.kind === "event") return event(update.id, update.author, update.createdAt, update.body);
        return (
          <li key={update.id} className="flex gap-2 py-1.5">
            {update.author ? (
              <MemberAvatar name={update.author.name} userId={update.author.id} avatar={update.author.avatar} size="xs" className="mt-0.5" />
            ) : (
              <span className="size-5 shrink-0 rounded-full bg-fill-active" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
                <span className="font-medium">{who(update.author)}</span>
                <span className="text-muted-foreground">{ago(update.createdAt)}</span>
                {update.kind === "report" ? <span className="text-info">· from the daily report</span> : null}
              </p>
              {update.kind === "report" && typeof update.meta?.status === "string" ? (
                <StatusPill status={update.meta.status as TaskStatus} className="self-start" />
              ) : null}
              {update.body ? <RichText text={update.body} className="text-[13px]" /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Pickers that only live here

function StatusPicker({ value, onChange, disabled }: { value: TaskStatus; onChange: (s: TaskStatus) => void; disabled?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <PropertyChip icon={<CircleDot />} className={cn("ring-0", STATUS_TONE_CLASS[value])}>
          {TASK_STATUS_LABELS[value]}
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="start">
        {TASK_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-fill-hover"
          >
            <span className={cn("size-2 rounded-full", STATUS_TONE_CLASS[status].split(" ")[0])} />
            {TASK_STATUS_LABELS[status]}
            <Check className={cn("ml-auto size-3.5", value === status ? "opacity-100" : "opacity-0")} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function LabelAdder({ onAdd }: { onAdd: (label: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <PropertyChip icon={<Tag />} muted>
          Label
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.trim()) return;
            onAdd(draft.trim());
            setDraft("");
          }}
          className="flex gap-1.5"
        >
          <input
            autoFocus
            value={draft}
            maxLength={30}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Client work, SEO…"
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none"
          />
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            Add
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function SubtaskPerson({
  people,
  value,
  onPick,
  viewerId,
  disabled,
}: {
  people: PickPerson[];
  value: TaskPerson | null;
  onPick: (id: string) => void;
  viewerId: string;
  disabled?: boolean;
}) {
  const face = value ? (
    <MemberAvatar name={value.name} userId={value.id} avatar={value.avatar} size="xs" />
  ) : (
    <UserPlus className="size-3.5" />
  );
  if (disabled) {
    return value ? <span title={value.name}>{face}</span> : null;
  }
  return (
    <AssigneePicker
      people={people}
      selected={value ? [value.id] : []}
      onToggle={onPick}
      viewerId={viewerId}
      trigger={
        <button
          type="button"
          aria-label={value ? `Assigned to ${value.name}` : "Assign"}
          title={value ? value.name : "Assign"}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-fill-active hover:text-foreground",
            !value && "opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100",
          )}
        >
          {face}
        </button>
      }
    />
  );
}

// ---------------------------------------------------------------------------

export function TaskWindow({
  taskId,
  preview,
  today,
  viewerId,
  people,
  boards,
  onClose,
}: {
  taskId: string;
  /** What the list already knows, shown while the rest loads. */
  preview: TaskSummary | null;
  today: string;
  viewerId: string;
  people: PickPerson[];
  boards: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [task, setTask] = useState<TaskDetail | null>(() => getCachedTask(taskId));
  const [missing, setMissing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [comment, setComment] = useState("");
  const [commentKey, setCommentKey] = useState(0);
  const [filter, setFilter] = useState<"all" | "comments">("all");
  const dirty = useRef(false);
  const activityEnd = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const detail = await fetchTask(taskId, true);
    if (!detail) setMissing(true);
    else setTask(detail);
  }, [taskId]);

  useEffect(() => {
    let live = true;
    fetchTask(taskId, true).then((detail) => {
      if (!live) return;
      if (!detail) setMissing(true);
      else setTask(detail);
    });
    return () => {
      live = false;
    };
  }, [taskId]);

  // Newest activity sits next to the comment box.
  const updateCount = task?.updates.length ?? 0;
  useEffect(() => {
    activityEnd.current?.scrollIntoView({ block: "end" });
  }, [updateCount, filter]);

  const close = () => {
    if (dirty.current) router.refresh();
    onClose();
  };

  /** Shows the change at once, saves, then reloads the task quietly. */
  const run = (action: () => Promise<ActionResult>, optimistic?: (current: TaskDetail) => TaskDetail, after?: () => void) => {
    const before = task;
    if (task && optimistic) {
      const next = optimistic(task);
      setTask(next);
      setCachedTask(next);
    }
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        if (before) {
          setTask(before);
          setCachedTask(before);
        }
        return;
      }
      dirty.current = true;
      after?.();
      await refresh();
    });
  };

  const person = (id: string): TaskPerson | null => {
    const found = people.find((item) => item.id === id);
    return found ? { id: found.id, name: found.name, avatar: found.avatar, designation: found.designation } : null;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/tasks?task=${taskId}`);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const title = task?.title ?? preview?.title ?? "";
  const can = task?.can ?? { edit: false, work: false, claim: false, archive: false };
  const done = task?.status === "done";
  const submitComment = () => {
    if (!comment.trim()) return;
    run(
      () => addTaskComment(taskId, comment),
      undefined,
      () => {
        setComment("");
        setCommentKey((key) => key + 1);
      },
    );
  };

  // People who have subtasks but no other role, shown beside the owner.
  const subtaskPeople = useMemo(() => {
    if (!task) return [];
    const counts = new Map<string, { person: TaskPerson; open: number }>();
    for (const step of task.steps) {
      if (!step.owner || step.owner.id === task.owner?.id) continue;
      const entry = counts.get(step.owner.id) ?? { person: step.owner, open: 0 };
      if (!step.done) entry.open += 1;
      counts.set(step.owner.id, entry);
    }
    return [...counts.values()];
  }, [task]);

  return (
    <Dialog open onOpenChange={(open) => (open ? null : close())}>
      <DialogContent
        showCloseButton={false}
        className="grid h-[min(90vh,860px)] w-[calc(100vw-1.5rem)] max-w-6xl grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-6xl lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        {/* Work */}
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-popover/95 px-5 py-3 backdrop-blur md:px-7">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {(task ?? preview)?.departmentName ?? "Personal task"}
              {task?.groupId ? " · one of a group" : ""}
            </p>
            {task && can.claim ? (
              <Button size="sm" disabled={pending} onClick={() => run(() => claimTask(taskId))}>
                Take this task
              </Button>
            ) : task && can.work ? (
              <Button
                size="sm"
                variant={done ? "outline" : "default"}
                disabled={pending}
                onClick={() =>
                  run(
                    () => setTaskStatus(taskId, done ? "in_progress" : "done"),
                    (current) => ({ ...current, status: done ? "in_progress" : "done" }),
                  )
                }
              >
                {done ? "Reopen" : (
                  <>
                    <Check className="size-4" />
                    Mark done
                  </>
                )}
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" aria-label="Copy link" title="Copy link" onClick={copyLink} className="size-8">
              <Link2 className="size-4" />
            </Button>
            {can.archive ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="More" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      startTransition(async () => {
                        const result = await archiveTask(taskId);
                        if (!result.success) toast.error(result.error);
                        else {
                          toast.success("Task archived.");
                          dirty.current = true;
                          close();
                        }
                      })
                    }
                  >
                    Archive task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button variant="ghost" size="icon" aria-label="Close" onClick={close} className="size-8">
              <X className="size-4" />
            </Button>
          </header>

          <div className="flex flex-col gap-6 px-5 py-5 md:px-7">
            {missing ? (
              <p className="text-sm text-muted-foreground">This task was archived or you no longer have access to it.</p>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {editingTitle ? (
                    <input
                      autoFocus
                      value={titleDraft}
                      maxLength={200}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      onBlur={() => {
                        setEditingTitle(false);
                        const next = titleDraft.trim();
                        if (next && next !== title) run(() => updateTask(taskId, { title: next }), (current) => ({ ...current, title: next }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") {
                          setTitleDraft(title);
                          setEditingTitle(false);
                        }
                      }}
                      className="w-full rounded-md bg-transparent text-[22px] font-semibold tracking-tight outline-none"
                    />
                  ) : (
                    <DialogTitle
                      onClick={() => {
                        if (!can.edit) return;
                        setTitleDraft(title);
                        setEditingTitle(true);
                      }}
                      className={cn(
                        "text-[22px] leading-tight font-semibold tracking-tight",
                        can.edit && "-mx-1.5 cursor-text rounded-md px-1.5 hover:bg-fill-hover",
                      )}
                    >
                      {title}
                    </DialogTitle>
                  )}
                  <DialogDescription className="sr-only">Task details, subtasks and activity.</DialogDescription>

                  {task ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusPicker
                        value={task.status}
                        disabled={!can.work}
                        onChange={(status) => run(() => setTaskStatus(taskId, status), (current) => ({ ...current, status }))}
                      />
                      {task.owner ? (
                        <AssigneePicker
                          people={people}
                          selected={[task.owner.id]}
                          onToggle={(id) => can.edit && run(() => updateTask(taskId, { ownerId: id }), (current) => ({ ...current, owner: person(id) ?? current.owner }))}
                          viewerId={viewerId}
                          trigger={
                            <PropertyChip disabled={!can.edit} title="Owner">
                              <MemberAvatar name={task.owner.name} userId={task.owner.id} avatar={task.owner.avatar} size="xs" />
                              {task.owner.id === viewerId ? "You" : task.owner.name}
                            </PropertyChip>
                          }
                        />
                      ) : (
                        <PropertyChip muted disabled>
                          Up for grabs · {task.openTo.map((rule) => rule.label).join(", ")}
                        </PropertyChip>
                      )}
                      {can.edit ? (
                        <>
                          <DuePicker
                            value={task.dueDate}
                            today={today}
                            onChange={(value) => run(() => updateTask(taskId, { dueDate: value }), (current) => ({ ...current, dueDate: value }))}
                          />
                          <PriorityPicker
                            value={task.priority}
                            onChange={(value) => run(() => updateTask(taskId, { priority: value }), (current) => ({ ...current, priority: value }))}
                          />
                          <BoardPicker
                            value={task.departmentId}
                            boards={boards}
                            onChange={(value) =>
                              value !== "auto" &&
                              run(
                                () => updateTask(taskId, { departmentId: value }),
                                (current) => ({
                                  ...current,
                                  departmentId: value,
                                  departmentName: boards.find((board) => board.id === value)?.name ?? null,
                                }),
                              )
                            }
                          />
                        </>
                      ) : null}
                      {task.labels.map((label) => (
                        <span key={label} className="inline-flex h-8 items-center gap-1 rounded-lg bg-fill-active px-2.5 text-[13px]">
                          {label}
                          {can.edit ? (
                            <button
                              type="button"
                              aria-label={`Remove ${label}`}
                              onClick={() => {
                                const labels = task.labels.filter((item) => item !== label);
                                run(() => updateTask(taskId, { labels }), (current) => ({ ...current, labels }));
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-3" />
                            </button>
                          ) : null}
                        </span>
                      ))}
                      {can.edit && task.labels.length < 6 ? (
                        <LabelAdder
                          onAdd={(label) => {
                            const labels = [...task.labels, label];
                            run(() => updateTask(taskId, { labels }), (current) => ({ ...current, labels }));
                          }}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Skeleton className="h-8 w-24 rounded-lg" />
                      <Skeleton className="h-8 w-28 rounded-lg" />
                      <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                  )}

                  {task ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
                      <span>People</span>
                      {task.helpers.map((helper) => (
                        <span key={helper.id} className="inline-flex items-center gap-1 text-foreground">
                          <MemberAvatar name={helper.name} userId={helper.id} avatar={helper.avatar} size="xs" />
                          {helper.id === viewerId ? "You" : helper.name.split(" ")[0]}
                          <span className="text-muted-foreground">(helping)</span>
                          {can.edit ? (
                            <button
                              type="button"
                              aria-label={`Remove ${helper.name}`}
                              onClick={() => {
                                const helperIds = task.helperIds.filter((id) => id !== helper.id);
                                run(
                                  () => updateTask(taskId, { helperIds }),
                                  (current) => ({ ...current, helperIds, helpers: current.helpers.filter((item) => item.id !== helper.id) }),
                                );
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-3" />
                            </button>
                          ) : null}
                        </span>
                      ))}
                      {subtaskPeople.map(({ person: member, open }) => (
                        <span key={member.id} className="inline-flex items-center gap-1 text-foreground" title="Has subtasks on this task">
                          <MemberAvatar name={member.name} userId={member.id} avatar={member.avatar} size="xs" />
                          {member.id === viewerId ? "You" : member.name.split(" ")[0]}
                          <span className="text-muted-foreground">({open ? `${open} ${open === 1 ? "subtask" : "subtasks"}` : "subtasks done"})</span>
                        </span>
                      ))}
                      {task.helpers.length === 0 && subtaskPeople.length === 0 && !can.edit ? <span>No one</span> : null}
                      {can.edit ? (
                        <AssigneePicker
                          people={people.filter((item) => item.id !== task.owner?.id)}
                          selected={task.helperIds}
                          onToggle={(id) => {
                            const helperIds = task.helperIds.includes(id) ? task.helperIds.filter((item) => item !== id) : [...task.helperIds, id];
                            run(() => updateTask(taskId, { helperIds }), (current) => ({
                              ...current,
                              helperIds,
                              helpers: helperIds.flatMap((item) => current.helpers.find((h) => h.id === item) ?? person(item) ?? []),
                            }));
                          }}
                          viewerId={viewerId}
                          trigger={
                            <button type="button" className="inline-flex items-center gap-1 rounded-md px-1 hover:text-foreground">
                              <Plus className="size-3.5" />
                              Add
                            </button>
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {task?.status === "blocked" ? (
                    <p className="rounded-lg bg-danger/[0.07] px-3 py-2 text-[13px] text-danger ring-1 ring-inset ring-danger/25">
                      Blocked{task.blockedReason ? `: ${task.blockedReason}` : ". Say what it's waiting on in a comment."}
                    </p>
                  ) : null}
                </div>

                {!task ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <>
                    <section className="flex flex-col gap-2">
                      <h3 className="card-title">Details</h3>
                      {editingDetails ? (
                        <div className="flex flex-col gap-2">
                          <RichEditor
                            autoFocus
                            value={detailsDraft}
                            onChange={setDetailsDraft}
                            toolbar="always"
                            placeholder="Add details, links, what done looks like…"
                            onSubmit={() =>
                              run(() => updateTask(taskId, { detailsMd: detailsDraft }), (current) => ({ ...current, detailsMd: detailsDraft }), () => setEditingDetails(false))
                            }
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingDetails(false)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                run(() => updateTask(taskId, { detailsMd: detailsDraft }), (current) => ({ ...current, detailsMd: detailsDraft }), () => setEditingDetails(false))
                              }
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          role={can.edit ? "button" : undefined}
                          tabIndex={can.edit ? 0 : undefined}
                          onClick={(event) => {
                            if (!can.edit || (event.target as HTMLElement).closest("a")) return;
                            setDetailsDraft(task.detailsMd);
                            setEditingDetails(true);
                          }}
                          onKeyDown={(event) => {
                            if (can.edit && event.key === "Enter") {
                              setDetailsDraft(task.detailsMd);
                              setEditingDetails(true);
                            }
                          }}
                          className={cn("-mx-2 rounded-lg px-2 py-1.5", can.edit && "cursor-text hover:bg-fill-hover")}
                        >
                          {task.detailsMd ? (
                            <RichText text={task.detailsMd} variant="points" />
                          ) : (
                            <p className="text-sm text-muted-foreground">{can.edit ? "Add details, links, what done looks like…" : "No details."}</p>
                          )}
                        </div>
                      )}
                    </section>

                    <section className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="card-title">Subtasks</h3>
                        {task.steps.length ? (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {task.steps.filter((step) => step.done).length} of {task.steps.length} done
                          </span>
                        ) : null}
                      </div>
                      <StepsBar done={task.steps.filter((step) => step.done).length} total={task.steps.length} />
                      <ul className="flex flex-col">
                        {task.steps.map((step) => (
                          <li key={step.id} className="group -mx-2 flex h-9 items-center gap-2.5 rounded-lg px-2 hover:bg-fill-hover">
                            <button
                              type="button"
                              disabled={!can.work}
                              aria-label={step.done ? "Mark not done" : "Mark done"}
                              onClick={() =>
                                run(
                                  () => toggleTaskStep(step.id, !step.done),
                                  (current) => ({
                                    ...current,
                                    steps: current.steps.map((item) => (item.id === step.id ? { ...item, done: !step.done } : item)),
                                  }),
                                )
                              }
                              className={cn(
                                "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                                step.done ? "border-ok bg-ok text-background" : "border-line-strong hover:border-foreground",
                              )}
                            >
                              {step.done ? <Check className="size-3" /> : null}
                            </button>
                            <span className={cn("min-w-0 flex-1 truncate text-sm", step.done && "text-muted-foreground line-through")}>
                              {step.title}
                            </span>
                            {can.work ? (
                              <div className={cn(!step.dueDate && "opacity-0 group-hover:opacity-100 focus-within:opacity-100")}>
                                <DuePicker
                                  value={step.dueDate}
                                  today={today}
                                  onChange={(value) =>
                                    run(
                                      () => updateTaskStep(step.id, { dueDate: value }),
                                      (current) => ({ ...current, steps: current.steps.map((item) => (item.id === step.id ? { ...item, dueDate: value } : item)) }),
                                    )
                                  }
                                />
                              </div>
                            ) : null}
                            <SubtaskPerson
                              people={people}
                              value={step.owner}
                              viewerId={viewerId}
                              disabled={!can.work}
                              onPick={(id) => {
                                const owner = step.owner?.id === id ? null : person(id);
                                run(
                                  () => updateTaskStep(step.id, { ownerId: owner?.id ?? null }),
                                  (current) => ({ ...current, steps: current.steps.map((item) => (item.id === step.id ? { ...item, owner } : item)) }),
                                );
                              }}
                            />
                            {can.work ? (
                              <button
                                type="button"
                                aria-label="Remove subtask"
                                onClick={() =>
                                  run(
                                    () => deleteTaskStep(step.id),
                                    (current) => ({ ...current, steps: current.steps.filter((item) => item.id !== step.id) }),
                                  )
                                }
                                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {can.work ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            const text = newSubtask.trim();
                            if (!text) return;
                            setNewSubtask("");
                            run(
                              () => addTaskStep(taskId, text),
                              (current) => ({
                                ...current,
                                steps: [...current.steps, { id: `new-${Date.now()}`, title: text, done: false, owner: null, dueDate: null, position: Number.MAX_SAFE_INTEGER }],
                              }),
                            );
                          }}
                          className="-mx-2 flex h-9 items-center gap-2.5 rounded-lg px-2 hover:bg-fill-hover"
                        >
                          <Plus className="size-4 shrink-0 text-muted-foreground" />
                          <input
                            value={newSubtask}
                            onChange={(event) => setNewSubtask(event.target.value)}
                            placeholder="Add a subtask"
                            maxLength={200}
                            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          />
                          {newSubtask.trim() ? <span className="text-xs text-muted-foreground">Enter</span> : null}
                        </form>
                      ) : null}
                    </section>

                    <p className="text-xs text-muted-foreground">
                      {task.createdBy ? (task.createdBy.id === viewerId ? "You" : task.createdBy.name) : "Someone"} created this{" "}
                      {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Activity */}
        <aside className="flex min-h-0 flex-col border-t border-line bg-fill-subtle max-lg:max-h-[45vh] lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="card-title">Activity</h3>
            <div className="flex gap-0.5 text-xs">
              {(["all", "comments"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "rounded-md px-2 py-1 transition-colors",
                    filter === value ? "bg-fill-active text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {value === "all" ? "All" : "Comments"}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {task ? (
              <Activity updates={task.updates} viewerId={viewerId} filter={filter} />
            ) : (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            )}
            <div ref={activityEnd} />
          </div>
          {task ? (
            <div className="border-t border-line p-3">
              <RichEditor
                key={commentKey}
                value={comment}
                onChange={setComment}
                placeholder="Write a comment…"
                minHeight={40}
                toolbar="none"
                onSubmit={submitComment}
                ariaLabel="Comment"
                className="bg-card dark:bg-card"
              />
              {comment.trim() ? (
                <div className="mt-2 flex items-center justify-end gap-3">
                  <span className="text-xs text-muted-foreground">Cmd+Enter</span>
                  <Button size="sm" disabled={pending} onClick={submitComment}>
                    Comment
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </DialogContent>
    </Dialog>
  );
}
