"use client";

import { MemberAvatar } from "@/components/mascot/member-avatar";
import { DUE_TONE_CLASS, STATUS_TONE_CLASS, dueInfo } from "@/lib/tasks/format";
import { cn } from "@/lib/utils";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPerson,
  type TaskPriority,
  type TaskStatus,
} from "@/types/task";

export function StatusPill({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap",
        STATUS_TONE_CLASS[status],
        className,
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

export function DueLabel({
  dueDate,
  today,
  status,
  className,
}: {
  dueDate: string | null;
  today: string;
  status?: TaskStatus;
  className?: string;
}) {
  const due = dueInfo(dueDate, today, status);
  return (
    <span className={cn("shrink-0 text-xs whitespace-nowrap tabular-nums", DUE_TONE_CLASS[due.tone], className)}>
      {due.label}
    </span>
  );
}

export function PriorityMark({ priority }: { priority: TaskPriority }) {
  if (priority === "normal" || priority === "low") return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        priority === "urgent" ? "bg-danger/15 text-danger" : "bg-warn/15 text-warn",
      )}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function PersonChip({
  person,
  size = "xs",
  showName = true,
  className,
}: {
  person: TaskPerson;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <MemberAvatar name={person.name} userId={person.id} avatar={person.avatar} size={size} />
      {showName ? <span className="truncate">{person.name.split(" ")[0]}</span> : null}
    </span>
  );
}

export function StepsBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  return (
    <div className="h-1 overflow-hidden rounded-full bg-fill-active">
      <div className="h-full rounded-full bg-ok" style={{ width: `${(done / total) * 100}%` }} />
    </div>
  );
}
