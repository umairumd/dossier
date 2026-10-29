"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DueLabel } from "@/components/tasks/task-bits";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import { Input } from "@/components/ui/input";
import { listMyReportTasks, type ReportTask, type ReportTaskUpdate } from "@/lib/actions/tasks";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@/types/task";

/**
 * Open tasks at the end of the daily report. Only tasks someone touched
 * (new status or a note) are sent with the report.
 */
export function ReportTasksSection({
  today,
  onChange,
}: {
  today: string;
  onChange: (updates: ReportTaskUpdate[]) => void;
}) {
  const [tasks, setTasks] = useState<ReportTask[] | null>(null);
  const [edits, setEdits] = useState<Record<string, { status: TaskStatus; note: string }>>({});

  useEffect(() => {
    let live = true;
    listMyReportTasks()
      .then((list) => {
        if (live) setTasks(list);
      })
      .catch(() => {
        if (live) setTasks([]);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!tasks) return;
    onChange(
      tasks.flatMap((task) => {
        const edit = edits[task.id];
        if (!edit || (edit.status === task.status && !edit.note.trim())) return [];
        return [{ taskId: task.id, status: edit.status, note: edit.note }];
      }),
    );
  }, [edits, tasks, onChange]);

  if (!tasks || tasks.length === 0) return null;

  const set = (task: ReportTask, patch: Partial<{ status: TaskStatus; note: string }>) =>
    setEdits((current) => ({
      ...current,
      [task.id]: { status: current[task.id]?.status ?? task.status, note: current[task.id]?.note ?? "", ...patch },
    }));

  return (
    <section className="col-span-full flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Your tasks</h3>
        <span className="text-xs text-muted-foreground">Update the ones you worked on</span>
      </div>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => {
          const edit = edits[task.id];
          const status = edit?.status ?? task.status;
          const touched = Boolean(edit && (edit.status !== task.status || edit.note.trim()));
          return (
            <li key={task.id} className="flex flex-col gap-2.5 rounded-xl bg-fill-subtle p-3 ring-1 ring-inset ring-edge">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/tasks?task=${task.id}`}
                  target="_blank"
                  className="min-w-0 text-sm font-medium underline-offset-2 hover:underline"
                >
                  {task.title}
                </Link>
                <DueLabel dueDate={task.dueDate} today={today} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedFilter
                  label={`Status of ${task.title}`}
                  value={status}
                  onChange={(value) => set(task, { status: value })}
                  options={TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }))}
                />
                {task.stepsTotal ? (
                  <span className="text-xs text-muted-foreground">
                    {task.stepsDone} of {task.stepsTotal} steps
                  </span>
                ) : null}
                {!touched ? <span className="text-xs text-muted-foreground">Unchanged</span> : null}
              </div>
              <Input
                value={edit?.note ?? ""}
                onChange={(event) => set(task, { note: event.target.value })}
                placeholder={status === "blocked" ? "What's it waiting on?" : "Note (optional)"}
                maxLength={2000}
                className="h-9"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
