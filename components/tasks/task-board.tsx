"use client";

import { useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { DueLabel, PersonChip, PriorityMark, StepsBar } from "@/components/tasks/task-bits";
import { prefetchTask } from "@/components/tasks/task-cache";
import { moveTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus, type TaskSummary } from "@/types/task";

export function TaskCard({
  task,
  today,
  onOpen,
  highlight,
  draggable,
  showOwner = true,
}: {
  task: TaskSummary;
  today: string;
  onOpen: (id: string) => void;
  highlight?: boolean;
  draggable?: boolean;
  showOwner?: boolean;
}) {
  const overdue = task.status !== "done" && task.dueDate != null && task.dueDate < today;
  const open = !task.owner;
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(event: DragEvent<HTMLButtonElement>) => {
        event.dataTransfer.setData("text/task-id", task.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(task.id)}
      onPointerEnter={() => prefetchTask(task.id)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg bg-card p-3 text-left ring-1 ring-inset ring-edge transition-colors outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-ring/50",
        overdue && "ring-danger/40",
        open && "bg-transparent [border-style:dashed] ring-line-strong",
        highlight && "ring-foreground/30",
        task.status === "done" && "opacity-60",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span className={cn("text-[13.5px] leading-snug font-medium", task.status === "done" && "line-through")}>
        {task.title}
      </span>
      <StepsBar done={task.stepsDone} total={task.stepsTotal} />
      {task.status === "blocked" && task.blockedReason ? (
        <span className="text-xs text-danger">{task.blockedReason}</span>
      ) : null}
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          {open ? (
            <span className="truncate">Up for grabs · {task.openTo.map((rule) => rule.label).join(", ")}</span>
          ) : showOwner && task.owner ? (
            <span title={task.owner.name} className="flex shrink-0">
              <MemberAvatar name={task.owner.name} userId={task.owner.id} avatar={task.owner.avatar} size="xs" />
            </span>
          ) : null}
          {task.stepsTotal ? (
            <span className="tabular-nums">
              {task.stepsDone}/{task.stepsTotal}
            </span>
          ) : null}
          <PriorityMark priority={task.priority} />
        </span>
        <DueLabel dueDate={task.dueDate} today={today} status={task.status} />
      </span>
    </button>
  );
}

function sortColumn(tasks: TaskSummary[]) {
  return [...tasks].sort((a, b) =>
    a.status === "done" ? (b.doneAt ?? "").localeCompare(a.doneAt ?? "") : a.position - b.position,
  );
}

/** Four columns. Cards move by dragging (desktop) or from the task window. */
export function TaskBoard({
  tasks,
  today,
  viewerId,
  onOpen,
  canMove,
  byPerson = false,
}: {
  tasks: TaskSummary[];
  today: string;
  viewerId: string;
  onOpen: (id: string) => void;
  canMove: (task: TaskSummary) => boolean;
  byPerson?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [over, setOver] = useState<string | null>(null);
  // Optimistic moves: the card jumps at once and saves behind.
  const [moved, setMoved] = useState<Record<string, { status: TaskStatus; position: number }>>({});
  const live = tasks.map((task) => (moved[task.id] ? { ...task, ...moved[task.id] } : task));

  const drop = (status: TaskStatus, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setOver(null);
    const id = event.dataTransfer.getData("text/task-id");
    const task = live.find((item) => item.id === id);
    if (!task) return;
    if (!canMove(task)) {
      toast.error("You can only move your own tasks here.");
      return;
    }
    const column = sortColumn(live.filter((item) => item.status === status && item.id !== id));
    const position = (column[column.length - 1]?.position ?? task.position) + 1;
    if (task.status === status) return;
    setMoved((prev) => ({ ...prev, [id]: { status, position } }));
    startTransition(async () => {
      const result = await moveTask(id, status, position);
      if (!result.success) {
        toast.error(result.error);
        setMoved((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return;
      }
      router.refresh();
    });
  };

  const column = (status: TaskStatus, list: TaskSummary[], key: string, compact = false) => (
    <div
      key={key}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(key);
      }}
      onDragLeave={() => setOver((current) => (current === key ? null : current))}
      onDrop={(event) => drop(status, event)}
      className={cn(
        "flex min-h-24 flex-col gap-2 rounded-xl p-2 transition-colors",
        !compact && "bg-fill-subtle ring-1 ring-inset ring-edge",
        over === key && "bg-fill-hover ring-1 ring-inset ring-foreground/20",
      )}
    >
      {!compact ? (
        <div className="flex items-center justify-between px-1.5 pt-1 pb-0.5 text-[13px] font-semibold">
          <span>
            {TASK_STATUS_LABELS[status]}{" "}
            <span className="font-normal text-muted-foreground tabular-nums">{list.length}</span>
          </span>
          {status === "done" ? <span className="text-xs font-normal text-muted-foreground">this week</span> : null}
        </div>
      ) : null}
      {sortColumn(list).map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          today={today}
          onOpen={onOpen}
          highlight={task.owner?.id === viewerId}
          draggable={canMove(task)}
          showOwner={!byPerson}
        />
      ))}
    </div>
  );

  if (!byPerson) {
    return (
      <div className="grid gap-3 overflow-x-auto md:grid-cols-4">
        {TASK_STATUSES.map((status) =>
          column(status, live.filter((task) => task.status === status), status),
        )}
      </div>
    );
  }

  // One row per person, plus "Up for grabs".
  const owners = new Map<string, { name: string; person: TaskSummary["owner"] }>();
  for (const task of live) {
    if (task.owner) owners.set(task.owner.id, { name: task.owner.name, person: task.owner });
  }
  const rows: { key: string; label: React.ReactNode; tasks: TaskSummary[] }[] = [];
  const unowned = live.filter((task) => !task.owner);
  if (unowned.length) rows.push({ key: "open", label: <span className="text-muted-foreground">Up for grabs</span>, tasks: unowned });
  for (const [id, { person }] of [...owners.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name))) {
    const list = live.filter((task) => task.owner?.id === id);
    const late = list.filter((task) => task.status !== "done" && task.dueDate && task.dueDate < today).length;
    rows.push({
      key: id,
      label: (
        <span className="flex flex-col gap-0.5">
          {person ? <PersonChip person={person} size="sm" className="font-medium" /> : null}
          <span className="pl-9 text-xs text-muted-foreground">
            {list.filter((task) => task.status !== "done").length} open
            {late ? <span className="text-danger"> · {late} late</span> : null}
          </span>
        </span>
      ),
      tasks: list,
    });
  }

  if (rows.length === 0) {
    return (
      <div className="surface-card rounded-xl bg-card px-5 py-10 text-center text-sm text-muted-foreground">
        No tasks on this board yet.
      </div>
    );
  }

  return (
    <div className="surface-card overflow-x-auto rounded-xl bg-card">
      <div className="grid min-w-[880px] grid-cols-[180px_repeat(4,minmax(0,1fr))] gap-2 border-b border-line px-3 py-2.5 text-xs font-semibold text-muted-foreground">
        <span />
        {TASK_STATUSES.map((status) => (
          <span key={status} className="px-2">
            {TASK_STATUS_LABELS[status]}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid min-w-[880px] grid-cols-[180px_repeat(4,minmax(0,1fr))] gap-2 border-b border-line px-3 py-2 last:border-b-0"
        >
          <div className="pt-2 text-[13px]">{row.label}</div>
          {TASK_STATUSES.map((status) =>
            column(status, row.tasks.filter((task) => task.status === status), `${row.key}:${status}`, true),
          )}
        </div>
      ))}
    </div>
  );
}
