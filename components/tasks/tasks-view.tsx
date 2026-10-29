"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Columns3, List, ListFilter, ListTodo, Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import { NewTaskDialog, type TaskComposeData } from "@/components/tasks/new-task-dialog";
import { DueLabel, PersonChip, PriorityMark, StatusPill } from "@/components/tasks/task-bits";
import { TaskBoard } from "@/components/tasks/task-board";
import { prefetchTask } from "@/components/tasks/task-cache";
import { TaskWindow } from "@/components/tasks/task-window";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { claimTask, setTaskStatus, toggleTaskStep } from "@/lib/actions/tasks";
import type { MySubtask } from "@/lib/supabase/queries/tasks";
import { cn } from "@/lib/utils";
import type { TaskSummary } from "@/types/task";

export type TasksViewMode = "mine" | "team" | "assigned";
type DueFilter = "any" | "overdue" | "week" | "none";

function weekEnd(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

function GroupLabel({ title, count }: { title: string; count: number }) {
  return (
    <li className="flex items-baseline gap-2 px-4 pt-4 pb-1.5 text-[13px] font-medium md:px-5">
      {title}
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </li>
  );
}

function TaskRow({
  task,
  today,
  viewerId,
  onOpen,
  showOwner,
}: {
  task: TaskSummary;
  today: string;
  viewerId: string;
  onOpen: (task: TaskSummary) => void;
  showOwner?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const done = optimisticDone ?? task.status === "done";
  const mine = task.owner?.id === viewerId;
  const subtitle = [
    task.createdBy && task.createdBy.id !== viewerId ? `From ${task.createdBy.name.split(" ")[0]}` : null,
    task.departmentName,
    task.stepsTotal ? `${task.stepsDone}/${task.stepsTotal} subtasks` : null,
    task.commentCount ? `${task.commentCount} ${task.commentCount === 1 ? "comment" : "comments"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      onPointerEnter={() => prefetchTask(task.id)}
      className="group flex items-center gap-3 border-t border-line px-4 py-2.5 transition-colors first:border-t-0 hover:bg-fill-hover md:px-5"
    >
      <button
        type="button"
        disabled={!mine || pending}
        aria-label={done ? "Reopen" : "Mark done"}
        title={mine ? (done ? "Reopen" : "Mark done") : undefined}
        onClick={() => {
          const next = !done;
          setOptimisticDone(next);
          startTransition(async () => {
            const result = await setTaskStatus(task.id, next ? "done" : "in_progress");
            if (!result.success) {
              setOptimisticDone(null);
              toast.error(result.error);
            } else router.refresh();
          });
        }}
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-ok bg-ok text-background" : "border-line-strong hover:border-foreground",
          !mine && "cursor-default opacity-40",
        )}
      >
        {done ? <Check className="size-3" /> : null}
      </button>
      <button type="button" onClick={() => onOpen(task)} className="flex min-w-0 flex-1 flex-col py-0.5 text-left">
        <span className={cn("truncate text-sm font-medium", done && "text-muted-foreground line-through")}>{task.title}</span>
        {subtitle ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}
      </button>
      {showOwner && task.owner ? (
        <PersonChip person={task.owner} className="text-xs text-muted-foreground max-sm:hidden" />
      ) : null}
      <PriorityMark priority={task.priority} />
      {!done && task.status !== "todo" ? <StatusPill status={task.status} className="max-sm:hidden" /> : null}
      <DueLabel dueDate={task.dueDate} today={today} status={task.status} className="w-24 text-right" />
    </li>
  );
}

export function TasksView({
  view: initialView,
  layout: initialLayout,
  by: initialBy,
  today,
  viewerId,
  mine,
  openForMe,
  subtasks,
  assigned,
  boards,
  boardId,
  boardTasks,
  canManageBoard,
  initialTaskId,
  compose,
}: {
  view: TasksViewMode;
  layout: "list" | "board";
  by: "status" | "person";
  today: string;
  viewerId: string;
  mine: TaskSummary[];
  openForMe: TaskSummary[];
  subtasks: MySubtask[];
  assigned: TaskSummary[];
  boards: { id: string; name: string }[];
  boardId: string | null;
  boardTasks: TaskSummary[];
  canManageBoard: boolean;
  initialTaskId: string | null;
  compose: TaskComposeData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  // Tabs, layout and grouping change on the spot: every list is already here.
  const [view, setView] = useState<TasksViewMode>(initialView);
  const [layout, setLayout] = useState<"list" | "board">(initialLayout);
  const [by, setBy] = useState<"status" | "person">(initialBy);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [due, setDue] = useState<DueFilter>("any");
  const [openTask, setOpenTask] = useState<{ id: string; preview: TaskSummary | null } | null>(
    initialTaskId ? { id: initialTaskId, preview: null } : null,
  );

  // Keep ?task= in the address without a server round trip, so the window
  // opens instantly and the link can be shared.
  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (key: string, value: string | null) => (value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    set("task", openTask?.id ?? null);
    set("view", view === "mine" ? null : view);
    set("layout", layout === (view === "team" ? "board" : "list") ? null : layout);
    set("by", by === "status" ? null : by);
    window.history.replaceState(window.history.state, "", url);
  }, [openTask, view, layout, by]);

  const switchView = (next: TasksViewMode) => {
    setView(next);
    setLayout(next === "team" ? "board" : "list");
  };

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("task");
    for (const [key, value] of Object.entries(patch)) {
      if (value == null) next.delete(key);
      else next.set(key, value);
    }
    const search = next.toString();
    router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };
  const open = (task: TaskSummary) => setOpenTask({ id: task.id, preview: task });
  const filtering = Boolean(query.trim()) || due !== "any";

  const end = weekEnd(today);
  const filter = (list: TaskSummary[]) =>
    list.filter((task) => {
      if (query.trim() && !task.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
      if (due === "overdue") return task.status !== "done" && Boolean(task.dueDate && task.dueDate < today);
      if (due === "week") return Boolean(task.dueDate && task.dueDate >= today && task.dueDate <= end);
      if (due === "none") return !task.dueDate;
      return true;
    });

  const openMine = mine.filter((task) => task.status !== "done");
  const counts = {
    mine: openMine.length,
    team: boardTasks.filter((task) => task.status !== "done").length,
    assigned: assigned.filter((task) => task.status !== "done").length,
  };
  const overdueCount = openMine.filter((task) => task.dueDate && task.dueDate < today).length;
  const visibleMine = filter(mine);
  const groups = useMemo(() => {
    const openList = visibleMine.filter((task) => task.status !== "done");
    return [
      { title: "Overdue", tasks: openList.filter((task) => task.dueDate && task.dueDate < today) },
      { title: "Due this week", tasks: openList.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= end) },
      { title: "Later", tasks: openList.filter((task) => task.dueDate && task.dueDate > end) },
      { title: "No date", tasks: openList.filter((task) => !task.dueDate) },
      { title: "Done this week", tasks: visibleMine.filter((task) => task.status === "done") },
    ];
  }, [visibleMine, today, end]);

  const assignedGroups = new Map<string, TaskSummary[]>();
  const assignedSingles: TaskSummary[] = [];
  for (const task of filter(assigned)) {
    if (task.groupId) assignedGroups.set(task.groupId, [...(assignedGroups.get(task.groupId) ?? []), task]);
    else assignedSingles.push(task);
  }

  const scopeOptions = [
    { value: "mine" as const, label: "My tasks", count: counts.mine },
    ...(boards.length ? [{ value: "team" as const, label: "Team", count: counts.team }] : []),
    ...(compose.isTeamLead || assigned.length ? [{ value: "assigned" as const, label: "Assigned by me", count: counts.assigned }] : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tasks"
        description={`${counts.mine} open${overdueCount ? ` · ${overdueCount} overdue` : ""}`}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New task
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedFilter label="Whose tasks" value={view} onChange={switchView} options={scopeOptions} />
        {view === "team" && boards.length > 1 ? (
          <Select value={boardId ?? undefined} onValueChange={(value) => go({ view: "team", board: value })}>
            <SelectTrigger className="w-auto max-w-56 gap-2 border-transparent bg-transparent shadow-none hover:bg-fill-hover" aria-label="Department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : view === "team" && boards[0] ? (
          <span className="px-1 text-sm text-muted-foreground">{boards[0].name}</span>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search tasks"
              className="h-9 w-36 pl-8 transition-[width] focus:w-52"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9", due !== "any" && "border-foreground/30")}>
                <ListFilter className="size-4" />
                {due === "any" ? "Filter" : { overdue: "Overdue", week: "This week", none: "No date" }[due]}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1.5">
              <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">Due date</p>
              {(
                [
                  ["any", "Any time"],
                  ["overdue", "Overdue"],
                  ["week", "Due this week"],
                  ["none", "No due date"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDue(value)}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-fill-hover"
                >
                  {label}
                  <Check className={cn("ml-auto size-3.5", due === value ? "opacity-100" : "opacity-0")} />
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9" aria-label="View options">
                {layout === "board" ? <Columns3 className="size-4" /> : <List className="size-4" />}
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-60 flex-col gap-3 p-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">Layout</p>
                <SegmentedFilter
                  label="Layout"
                  value={layout}
                  onChange={setLayout}
                  className="w-full [&>*]:flex-1"
                  options={[
                    { value: "list", label: "List" },
                    { value: "board", label: "Board" },
                  ]}
                />
              </div>
              {layout === "board" && view === "team" && canManageBoard ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">Columns for</p>
                  <SegmentedFilter
                    label="Group by"
                    value={by}
                    onChange={setBy}
                    className="w-full [&>*]:flex-1"
                    options={[
                      { value: "status", label: "Status" },
                      { value: "person", label: "Each person" },
                    ]}
                  />
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {view === "mine" && openForMe.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="card-title">Up for grabs</h2>
          <ul className="surface-card overflow-hidden rounded-xl bg-card">
            {openForMe.map((task) => (
              <li key={task.id} className="flex items-center gap-3 border-t border-line px-4 py-2.5 first:border-t-0 md:px-5">
                <button type="button" onClick={() => open(task)} className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate text-sm font-medium">{task.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Open to {task.openTo.map((rule) => rule.label).join(", ")}
                    {task.createdBy ? ` · from ${task.createdBy.name.split(" ")[0]}` : ""}
                  </span>
                </button>
                <DueLabel dueDate={task.dueDate} today={today} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await claimTask(task.id);
                      if (!result.success) toast.error(result.error);
                      else {
                        toast.success("It's yours.");
                        router.refresh();
                      }
                    })
                  }
                >
                  Take it
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view === "mine" && subtasks.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="card-title">Subtasks given to you</h2>
          <ul className="surface-card overflow-hidden rounded-xl bg-card">
            {subtasks.map((subtask) => (
              <li key={subtask.id} className="flex items-center gap-3 border-t border-line px-4 py-2.5 first:border-t-0 md:px-5">
                <button
                  type="button"
                  aria-label="Mark done"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await toggleTaskStep(subtask.id, true);
                      if (!result.success) toast.error(result.error);
                      else router.refresh();
                    })
                  }
                  className="flex size-4 shrink-0 items-center justify-center rounded border border-line-strong hover:border-foreground"
                />
                <button
                  type="button"
                  onClick={() => setOpenTask({ id: subtask.taskId, preview: null })}
                  className="flex min-w-0 flex-1 flex-col text-left"
                >
                  <span className="truncate text-sm font-medium">{subtask.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Part of {subtask.taskTitle}
                    {subtask.taskOwner ? ` · ${subtask.taskOwner.name.split(" ")[0]} owns it` : ""}
                  </span>
                </button>
                {subtask.taskOwner ? (
                  <MemberAvatar name={subtask.taskOwner.name} userId={subtask.taskOwner.id} avatar={subtask.taskOwner.avatar} size="xs" />
                ) : null}
                <DueLabel dueDate={subtask.dueDate} today={today} className="w-24 text-right" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view === "mine" && layout === "list" ? (
        visibleMine.length === 0 ? (
          <EmptyState
            icon={<ListTodo className="size-5" />}
            title={filtering ? "No tasks match" : "No tasks yet"}
            description={filtering ? "Try a different search or filter." : "Tasks given to you show here and at the end of your daily report."}
          />
        ) : (
          <ul className="surface-card overflow-hidden rounded-xl bg-card pb-1.5">
            {groups.map((group) =>
              group.tasks.length ? (
                <Fragment key={group.title}>
                  <GroupLabel title={group.title} count={group.tasks.length} />
                  {group.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} today={today} viewerId={viewerId} onOpen={open} />
                  ))}
                </Fragment>
              ) : null,
            )}
          </ul>
        )
      ) : null}

      {view === "mine" && layout === "board" ? (
        <TaskBoard
          tasks={visibleMine}
          today={today}
          viewerId={viewerId}
          onOpen={(id) => setOpenTask({ id, preview: mine.find((task) => task.id === id) ?? null })}
          canMove={(task) => task.owner?.id === viewerId || task.helperIds.includes(viewerId)}
        />
      ) : null}

      {view === "team" ? (
        !boardId ? (
          <EmptyState icon={<ListTodo className="size-5" />} title="No team yet" description="Team boards belong to departments." />
        ) : layout === "board" ? (
          <TaskBoard
            tasks={filter(boardTasks)}
            today={today}
            viewerId={viewerId}
            onOpen={(id) => setOpenTask({ id, preview: boardTasks.find((task) => task.id === id) ?? null })}
            byPerson={by === "person" && canManageBoard}
            canMove={(task) => canManageBoard || task.owner?.id === viewerId || task.helperIds.includes(viewerId)}
          />
        ) : (
          <ul className="surface-card overflow-hidden rounded-xl bg-card">
            {filter(boardTasks).map((task) => (
              <TaskRow key={task.id} task={task} today={today} viewerId={viewerId} onOpen={open} showOwner />
            ))}
          </ul>
        )
      ) : null}

      {view === "assigned" ? (
        assigned.length === 0 ? (
          <EmptyState icon={<ListTodo className="size-5" />} title="Nothing assigned" description="Tasks you give to other people show here." />
        ) : layout === "board" ? (
          <TaskBoard
            tasks={filter(assigned)}
            today={today}
            viewerId={viewerId}
            onOpen={(id) => setOpenTask({ id, preview: assigned.find((task) => task.id === id) ?? null })}
            canMove={() => true}
          />
        ) : (
          <ul className="surface-card overflow-hidden rounded-xl bg-card">
            {[...assignedGroups.entries()].map(([groupId, tasks]) => {
              const finished = tasks.filter((task) => task.status === "done").length;
              return (
                <li key={groupId} className="flex flex-col border-t border-line first:border-t-0">
                  <div className="flex items-center gap-3 px-4 pt-3 pb-1 md:px-5">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{tasks[0].title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {finished} of {tasks.length} done
                    </span>
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-fill-active">
                      <div className="h-full rounded-full bg-ok" style={{ width: `${(finished / tasks.length) * 100}%` }} />
                    </div>
                  </div>
                  <ul className="pb-1 pl-5">
                    {tasks.map((task) => (
                      <TaskRow key={task.id} task={task} today={today} viewerId={viewerId} onOpen={open} showOwner />
                    ))}
                  </ul>
                </li>
              );
            })}
            {assignedSingles.map((task) => (
              <TaskRow key={task.id} task={task} today={today} viewerId={viewerId} onOpen={open} showOwner />
            ))}
          </ul>
        )
      ) : null}

      <NewTaskDialog
        key={view === "team" ? `team-${boardId}` : view}
        open={creating}
        onOpenChange={setCreating}
        data={compose}
        viewerId={viewerId}
        today={today}
        defaultDepartmentId={view === "team" ? boardId : null}
        onCreated={(ids) => {
          if (ids.length === 1) setOpenTask({ id: ids[0], preview: null });
        }}
      />
      {openTask ? (
        <TaskWindow
          key={openTask.id}
          taskId={openTask.id}
          preview={openTask.preview}
          today={today}
          viewerId={viewerId}
          people={compose.people}
          boards={compose.boards}
          onClose={() => setOpenTask(null)}
        />
      ) : null}
    </div>
  );
}
