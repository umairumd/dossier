import { CalendarClock, ListTodo, TriangleAlert } from "lucide-react";
import { ForYouIcon, type ForYouItem } from "@/components/dashboard/hero-for-you";
import { dueInfo } from "@/lib/tasks/format";
import type { TaskSummary } from "@/types/task";

const SHOWN = 3;

function nextDue(label: string): string {
  return label.startsWith("Due ") ? `Next ${label.charAt(0).toLowerCase()}${label.slice(1)}` : `Next due ${label}`;
}

/**
 * Tasks in For you: each overdue or due-today task gets its own row until it
 * is done; everything else collapses into one "more open tasks" row. Task
 * rows can't be dismissed: they leave when the task is finished.
 */
export function taskForYouItems(tasks: TaskSummary[], today: string): ForYouItem[] {
  const open = tasks.filter((task) => task.status !== "done");
  const urgent = open
    .filter((task) => task.dueDate && task.dueDate <= today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const shown = urgent.slice(0, SHOWN);
  const rest = open.filter((task) => !shown.includes(task));

  const items: ForYouItem[] = shown.map((task) => {
    const overdue = task.dueDate! < today;
    const group = overdue ? "action" : "warning";
    const due = dueInfo(task.dueDate, today, task.status);
    return {
      id: task.id,
      source: "task",
      group,
      at: task.dueDate ?? "",
      icon: <ForYouIcon group={group}>{overdue ? <TriangleAlert /> : <CalendarClock />}</ForYouIcon>,
      title: task.title,
      meta: [
        overdue ? due.label : "Due today",
        task.createdBy ? `from ${task.createdBy.name.split(" ")[0]}` : null,
        task.stepsTotal ? `${task.stepsDone} of ${task.stepsTotal} steps` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      actions: [{ label: "Open task", href: `/tasks?task=${task.id}` }],
    };
  });

  if (rest.length > 0) {
    const next = rest
      .filter((task) => task.dueDate)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];
    items.push({
      id: "more-tasks",
      source: "task",
      group: "other",
      at: "",
      icon: (
        <ForYouIcon group="other">
          <ListTodo />
        </ForYouIcon>
      ),
      title:
        shown.length > 0
          ? `${rest.length} more open ${rest.length === 1 ? "task" : "tasks"}`
          : `${rest.length} open ${rest.length === 1 ? "task" : "tasks"}`,
      meta: next ? nextDue(dueInfo(next.dueDate, today).label) : "None with a due date",
      actions: [{ label: "All tasks", href: "/tasks" }],
    });
  }
  return items;
}
