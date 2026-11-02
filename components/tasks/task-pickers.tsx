"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, Check, Columns3, Flag, Users } from "lucide-react";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { QuickDatePanel } from "@/components/shared/date-picker";
import { shiftReportDate } from "@/lib/helpers/dates";
import { dueInfo, DUE_TONE_CLASS } from "@/lib/tasks/format";
import { cn } from "@/lib/utils";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, type TaskPriority } from "@/types/task";

export type PickPerson = { id: string; name: string; avatar: unknown | null; designation?: string | null };
export type OpenRule = { kind: "department" | "designation"; value: string };

/** The chip that opens a property picker, the same height everywhere. */
export function PropertyChip({
  icon,
  children,
  muted,
  className,
  ...props
}: { icon?: ReactNode; children: ReactNode; muted?: boolean; className?: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg px-2.5 text-[13px] ring-1 ring-inset ring-edge transition-colors hover:bg-fill-hover data-[state=open]:bg-fill-active [&_svg]:size-3.5 [&_svg]:shrink-0",
        muted ? "text-muted-foreground" : "bg-fill-subtle text-foreground",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** Choose people (several), or leave the task open to a group. */
export function AssigneePicker({
  people,
  selected,
  onToggle,
  openTo,
  onOpenTo,
  groups,
  viewerId,
  trigger,
}: {
  people: PickPerson[];
  selected: string[];
  onToggle: (id: string) => void;
  openTo?: OpenRule[];
  onOpenTo?: (rule: OpenRule) => void;
  groups?: { departments: { id: string; name: string }[]; designations: string[] };
  viewerId: string;
  trigger: ReactNode;
}) {
  const me = people.find((person) => person.id === viewerId);
  const others = people.filter((person) => person.id !== viewerId);
  // The item's own check mark (data-checked) sits at the far right.
  const row = (person: PickPerson, label?: string) => (
    <CommandItem
      key={person.id}
      value={`${person.name} ${person.designation ?? ""} ${person.id}`}
      data-checked={selected.includes(person.id)}
      onSelect={() => onToggle(person.id)}
      className="gap-2.5 py-1.5"
    >
      <MemberAvatar name={person.name} userId={person.id} avatar={person.avatar} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{label ?? person.name}</span>
        {person.designation && !label ? (
          <span className="truncate text-xs text-muted-foreground">{person.designation}</span>
        ) : null}
      </span>
    </CommandItem>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            {me ? <CommandGroup>{row(me, "Me")}</CommandGroup> : null}
            {others.length ? <CommandGroup heading="People">{others.map((person) => row(person))}</CommandGroup> : null}
            {groups && onOpenTo && (groups.departments.length || groups.designations.length) ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Or open it to a group">
                  {groups.departments.map((dept) => (
                    <CommandItem
                      key={dept.id}
                      value={`dept ${dept.name}`}
                      data-checked={openTo?.some((rule) => rule.value === dept.id) ?? false}
                      onSelect={() => onOpenTo({ kind: "department", value: dept.id })}
                      className="gap-2.5"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill-active">
                        <Users className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{dept.name}</span>
                    </CommandItem>
                  ))}
                  {groups.designations.map((designation) => (
                    <CommandItem
                      key={designation}
                      value={`designation ${designation}`}
                      data-checked={openTo?.some((rule) => rule.value === designation) ?? false}
                      onSelect={() => onOpenTo({ kind: "designation", value: designation })}
                      className="gap-2.5"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill-active">
                        <Users className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">Any {designation}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function nextMonday(today: string): string {
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  return shiftReportDate(today, ((8 - day) % 7) || 7);
}

export function DuePicker({
  value,
  onChange,
  today,
  muted,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  today: string;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const due = dueInfo(value, today);
  const quick = [
    { label: "Today", value: today },
    { label: "Tomorrow", value: shiftReportDate(today, 1) },
    { label: "Next Monday", value: nextMonday(today) },
    { label: "In a week", value: shiftReportDate(today, 7) },
  ];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PropertyChip icon={<CalendarDays />} muted={!value || muted} className={value ? DUE_TONE_CLASS[due.tone] : undefined}>
          {value ? due.label : "Due date"}
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <QuickDatePanel
          options={quick}
          value={value ?? ""}
          min={today}
          clearLabel="No due date"
          hint={(date) => dueInfo(date, today).label}
          onChange={(next) => {
            onChange(next || null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

const PRIORITY_TONE: Record<TaskPriority, string> = {
  low: "text-muted-foreground",
  normal: "text-muted-foreground",
  high: "text-warn",
  urgent: "text-danger",
};

export function PriorityPicker({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <PropertyChip icon={<Flag className={PRIORITY_TONE[value]} />} muted={value === "normal"}>
          {value === "normal" ? "Priority" : TASK_PRIORITY_LABELS[value]}
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="start">
        {TASK_PRIORITIES.map((priority) => (
          <button
            key={priority}
            type="button"
            onClick={() => onChange(priority)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-fill-hover"
          >
            <Flag className={cn("size-3.5", PRIORITY_TONE[priority])} />
            {TASK_PRIORITY_LABELS[priority]}
            <Check className={cn("ml-auto size-3.5", value === priority ? "opacity-100" : "opacity-0")} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Which department board a task sits on. "auto" decides from who owns it. */
export function BoardPicker({
  value,
  onChange,
  boards,
  allowAuto = false,
}: {
  value: string | null | "auto";
  onChange: (value: string | null | "auto") => void;
  boards: { id: string; name: string }[];
  allowAuto?: boolean;
}) {
  const name =
    value === "auto" ? "Board: automatic" : value ? (boards.find((board) => board.id === value)?.name ?? "Board") : "No board";
  const option = (key: string | null | "auto", label: string, hint?: string) => (
    <button
      key={String(key)}
      type="button"
      onClick={() => onChange(key)}
      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-fill-hover"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Check className={cn("mt-0.5 size-3.5 shrink-0", value === key ? "opacity-100" : "opacity-0")} />
    </button>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <PropertyChip icon={<Columns3 />} muted={value === "auto" || value === null}>
          {name}
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5" align="start">
        {allowAuto ? option("auto", "Automatic", "Your own tasks stay personal; others go on their department's board.") : null}
        {option(null, "No board", "Only the people on the task see it.")}
        {boards.length ? <div className="my-1 h-px bg-line" /> : null}
        {boards.map((board) => option(board.id, board.name))}
      </PopoverContent>
    </Popover>
  );
}
