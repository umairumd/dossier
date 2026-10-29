"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { RichEditor } from "@/components/shared/rich-editor";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import {
  AssigneePicker,
  BoardPicker,
  DuePicker,
  PriorityPicker,
  PropertyChip,
  type OpenRule,
  type PickPerson,
} from "@/components/tasks/task-pickers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types/task";

export type TaskComposeData = {
  people: (PickPerson & { departmentIds: string[] })[];
  departments: { id: string; name: string }[];
  designations: string[];
  canOpenToGroups: boolean;
  /** Can give tasks to anyone besides themselves. */
  isTeamLead: boolean;
  /** Boards this person can put tasks on. */
  boards: { id: string; name: string }[];
};

/**
 * New task: a title, optional details, then one row of property chips
 * (who, when, priority), the way modern task tools do it. Several people
 * means either separate copies or one shared task with a lead.
 */
export function NewTaskDialog({
  open,
  onOpenChange,
  data,
  viewerId,
  today,
  defaultDepartmentId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TaskComposeData;
  viewerId: string;
  today: string;
  defaultDepartmentId?: string | null;
  onCreated?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [assignees, setAssignees] = useState<string[]>([viewerId]);
  const [openTo, setOpenTo] = useState<OpenRule[]>([]);
  const [mode, setMode] = useState<"each" | "lead">("each");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [board, setBoard] = useState<string | null | "auto">(defaultDepartmentId ?? "auto");
  const [editorKey, setEditorKey] = useState(0);

  const byId = new Map(data.people.map((person) => [person.id, person]));
  const several = assignees.length > 1;
  const nameOf = (id: string) => (id === viewerId ? "Me" : (byId.get(id)?.name ?? "Someone"));
  const firstNameOf = (id: string) => (id === viewerId ? "you" : (byId.get(id)?.name.split(" ")[0] ?? "they"));

  const toggle = (id: string) => {
    setOpenTo([]);
    setAssignees((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  };
  const toggleOpen = (rule: OpenRule) => {
    setAssignees([]);
    setOpenTo((list) =>
      list.some((item) => item.value === rule.value) ? list.filter((item) => item.value !== rule.value) : [...list, rule],
    );
  };
  const makeLead = (id: string) => setAssignees((list) => [id, ...list.filter((item) => item !== id)]);

  const reset = () => {
    setTitle("");
    setDetails("");
    setEditorKey((key) => key + 1);
    setAssignees([viewerId]);
    setOpenTo([]);
    setMode("each");
    setDueDate(null);
    setPriority("normal");
    setBoard(defaultDepartmentId ?? "auto");
  };

  const canSubmit = Boolean(title.trim()) && (assignees.length > 0 || openTo.length > 0) && !pending;
  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await createTask({
        title,
        detailsMd: details,
        assigneeIds: assignees,
        mode,
        openTo: assignees.length ? [] : openTo,
        dueDate,
        priority,
        departmentId: board === "auto" ? undefined : board,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.ids.length > 1 ? `Created ${result.ids.length} tasks.` : "Task created.");
      reset();
      router.refresh();
      onOpenChange(false);
      onCreated?.(result.ids);
    });
  };

  const openLabel = (rule: OpenRule) =>
    rule.kind === "department"
      ? (data.departments.find((dept) => dept.id === rule.value)?.name ?? "A department")
      : `Any ${rule.value}`;

  const assigneeTrigger = (
    <PropertyChip icon={assignees.length === 0 && openTo.length === 0 ? <UserRound /> : undefined} muted={assignees.length === 0 && openTo.length === 0}>
      {assignees.length > 0 ? (
        <>
          <span className="flex -space-x-1">
            {assignees.slice(0, 4).map((id) => {
              const person = byId.get(id);
              return person ? (
                <MemberAvatar key={id} name={person.name} userId={id} avatar={person.avatar} size="xs" />
              ) : null;
            })}
          </span>
          <span className="truncate">
            {assignees.length === 1 ? nameOf(assignees[0]) : `${assignees.length} people`}
          </span>
        </>
      ) : openTo.length > 0 ? (
        <>
          <Users />
          <span className="truncate">Open to {openTo.map(openLabel).join(", ")}</span>
        </>
      ) : (
        "Assign"
      )}
    </PropertyChip>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <DialogTitle className="text-[13px] font-medium text-muted-foreground">New task</DialogTitle>
          <DialogDescription className="sr-only">Give the task a title, then choose who it is for.</DialogDescription>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto px-5 pt-1 pb-4">
          <input
            autoFocus
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
            }}
            placeholder="Task title"
            aria-label="Task title"
            className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/70"
          />
          <RichEditor
            key={editorKey}
            value={details}
            onChange={setDetails}
            placeholder="Add details, links, what done looks like…"
            minHeight={72}
            onSubmit={submit}
            ariaLabel="Details"
            variant="bare"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <AssigneePicker
              people={data.people}
              selected={assignees}
              onToggle={toggle}
              openTo={openTo}
              onOpenTo={data.canOpenToGroups ? toggleOpen : undefined}
              groups={data.canOpenToGroups ? { departments: data.departments, designations: data.designations } : undefined}
              viewerId={viewerId}
              trigger={assigneeTrigger}
            />
            <DuePicker value={dueDate} onChange={setDueDate} today={today} />
            <PriorityPicker value={priority} onChange={setPriority} />
            {data.boards.length ? <BoardPicker value={board} onChange={setBoard} boards={data.boards} allowAuto /> : null}
          </div>

          {several ? (
            <div className="flex flex-col gap-3 rounded-xl bg-fill-subtle p-3 ring-1 ring-inset ring-edge">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{assignees.length} people</p>
                <SegmentedFilter
                  label="How to share it"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "each", label: "A copy each" },
                    { value: "lead", label: "One shared task" },
                  ]}
                />
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {assignees.map((id, index) => {
                  const person = byId.get(id);
                  if (!person) return null;
                  const lead = mode === "lead" && index === 0;
                  return (
                    <li
                      key={id}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-lg bg-card pr-1 pl-1.5 text-[13px] ring-1 ring-inset ring-edge",
                        lead && "ring-foreground/30",
                      )}
                    >
                      <MemberAvatar name={person.name} userId={id} avatar={person.avatar} size="xs" />
                      {nameOf(id)}
                      {mode === "lead" ? (
                        <button
                          type="button"
                          aria-label={lead ? "Leads" : `Make ${person.name} the lead`}
                          title={lead ? "Leads" : "Make lead"}
                          onClick={() => makeLead(id)}
                          className={cn("rounded p-0.5", lead ? "text-warn" : "text-muted-foreground hover:text-foreground")}
                        >
                          <Star className={cn("size-3.5", lead && "fill-current")} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Remove ${person.name}`}
                        onClick={() => toggle(id)}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                {mode === "each"
                  ? `Everyone gets their own copy with its own status. You see how many are done.`
                  : `One task with one status. ${firstNameOf(assignees[0]).replace(/^./, (c) => c.toUpperCase())} ${assignees[0] === viewerId ? "lead" : "leads"}, the others help and get updates. Star someone to make them the lead.`}
              </p>
            </div>
          ) : null}
          {openTo.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              It goes in Up for grabs on the board. The first person to take it becomes the owner.
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-3">
          <span className="ml-auto text-xs text-muted-foreground max-sm:hidden">Cmd+Enter to create</span>
          <Button onClick={submit} disabled={!canSubmit} className="max-sm:ml-auto">
            {pending ? "Creating…" : several && mode === "each" ? `Create ${assignees.length} tasks` : "Create task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
