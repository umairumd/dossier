export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high", "urgent"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export interface TaskPerson {
  id: string;
  name: string;
  avatar: unknown | null;
  designation?: string | null;
}

export interface TaskOpenTo {
  kind: "department" | "designation";
  value: string;
  label: string;
}

/** A task as lists and boards show it. */
export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  owner: TaskPerson | null;
  openTo: TaskOpenTo[];
  departmentId: string | null;
  departmentName: string | null;
  groupId: string | null;
  dueDate: string | null;
  blockedReason: string | null;
  position: number;
  createdBy: TaskPerson | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
  helperIds: string[];
  stepsDone: number;
  stepsTotal: number;
  commentCount: number;
}

export interface TaskStep {
  id: string;
  title: string;
  done: boolean;
  owner: TaskPerson | null;
  dueDate: string | null;
  position: number;
}

export interface TaskUpdate {
  id: string;
  kind: "comment" | "report" | "event";
  body: string;
  author: TaskPerson | null;
  meta: Record<string, unknown> | null;
  reportDate: string | null;
  createdAt: string;
}

export interface TaskDetail extends TaskSummary {
  detailsMd: string;
  helpers: TaskPerson[];
  steps: TaskStep[];
  updates: TaskUpdate[];
  /** What the viewer may do. */
  can: {
    edit: boolean;
    work: boolean;
    claim: boolean;
    archive: boolean;
  };
}
