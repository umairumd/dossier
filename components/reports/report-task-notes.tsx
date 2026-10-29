"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RichText } from "@/components/shared/rich-text";
import { StatusPill } from "@/components/tasks/task-bits";
import { getReportTaskNotes } from "@/lib/actions/tasks";
import { TASK_STATUSES, type TaskStatus } from "@/types/task";

type Note = { taskId: string; title: string; status: string | null; body: string };

/** "Task updates" under a report: what the writer changed on their tasks. */
export function ReportTaskNotes({ authorId, reportDate }: { authorId: string; reportDate: string }) {
  const [state, setState] = useState<{ key: string; notes: Note[] } | null>(null);
  const key = `${authorId}:${reportDate}`;

  useEffect(() => {
    let live = true;
    getReportTaskNotes(authorId, reportDate)
      .then((notes) => {
        if (live) setState({ key, notes });
      })
      .catch(() => {
        if (live) setState({ key, notes: [] });
      });
    return () => {
      live = false;
    };
  }, [authorId, reportDate, key]);

  const notes = state?.key === key ? state.notes : [];
  if (notes.length === 0) return null;
  return (
    <section aria-label="Task updates" className="mt-6 flex flex-col gap-3 border-t border-edge pt-5">
      <h3 className="field-label">Task updates</h3>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li key={note.taskId} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/tasks?task=${note.taskId}`} className="text-sm font-medium underline-offset-2 hover:underline">
                {note.title}
              </Link>
              {note.status && TASK_STATUSES.includes(note.status as TaskStatus) ? (
                <StatusPill status={note.status as TaskStatus} />
              ) : null}
            </div>
            {note.body ? (
              <div className="border-l-2 border-line-strong pl-3">
                <RichText text={note.body} className="text-[13.5px]" />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
