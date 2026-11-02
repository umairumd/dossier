"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, Columns3, Flag, Users } from "lucide-react";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { QuickDatePanel } from "@/components/shared/date-picker";
import { PickerPopover, type PickerOption } from "@/components/shared/picker";
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
  single = false,
}: {
  people: PickPerson[];
  selected: string[];
  onToggle: (id: string) => void;
  openTo?: OpenRule[];
  onOpenTo?: (rule: OpenRule) => void;
  groups?: { departments: { id: string; name: string }[]; designations: string[] };
  viewerId: string;
  trigger: ReactNode;
  /** One person only: the list closes after a pick. */
  single?: boolean;
}) {
  const me = people.find((person) => person.id === viewerId);
  const others = people.filter((person) => person.id !== viewerId);
  const personOption = (person: PickPerson, label?: string): PickerOption => ({
    value: person.id,
    label: label ?? person.name,
    description: label ? null : person.designation,
    keywords: person.name,
    icon: <MemberAvatar name={person.name} userId={person.id} avatar={person.avatar} size="sm" />,
  });
  const groupIcon = (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill-active">
      <Users className="size-3.5" />
    </span>
  );
  const canOpen = Boolean(groups && onOpenTo && (groups.departments.length || groups.designations.length));
  return (
    <PickerPopover
      trigger={trigger}
      width="w-80"
      multiple={!single}
      searchPlaceholder="Search people…"
      selected={[
        ...selected,
        ...(openTo ?? []).map((rule) => `${rule.kind === "department" ? "dept" : "desig"}:${rule.value}`),
      ]}
      sections={[
        { options: me ? [personOption(me, "Me")] : [] },
        { heading: "People", options: others.map((person) => personOption(person)) },
        {
          heading: "Or open it to a group",
          options: canOpen
            ? [
                ...groups!.departments.map((dept) => ({
                  value: `dept:${dept.id}`,
                  label: dept.name,
                  icon: groupIcon,
                })),
                ...groups!.designations.map((designation) => ({
                  value: `desig:${designation}`,
                  label: `Any ${designation}`,
                  icon: groupIcon,
                })),
              ]
            : [],
        },
      ]}
      onSelect={(value) => {
        if (value.startsWith("dept:")) onOpenTo?.({ kind: "department", value: value.slice(5) });
        else if (value.startsWith("desig:")) onOpenTo?.({ kind: "designation", value: value.slice(6) });
        else onToggle(value);
      }}
    />
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
    <PickerPopover
      width="w-48"
      trigger={
        <PropertyChip icon={<Flag className={PRIORITY_TONE[value]} />} muted={value === "normal"}>
          {value === "normal" ? "Priority" : TASK_PRIORITY_LABELS[value]}
        </PropertyChip>
      }
      selected={[value]}
      sections={[
        {
          options: TASK_PRIORITIES.map((priority) => ({
            value: priority,
            label: TASK_PRIORITY_LABELS[priority],
            icon: <Flag className={cn("size-3.5", PRIORITY_TONE[priority])} />,
          })),
        },
      ]}
      onSelect={(next) => onChange(next as TaskPriority)}
    />
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
  // The list works with strings; "none" stands for no board.
  const current = value === null ? "none" : value;
  return (
    <PickerPopover
      width="w-72"
      trigger={
        <PropertyChip icon={<Columns3 />} muted={value === "auto" || value === null}>
          {name}
        </PropertyChip>
      }
      selected={[current]}
      searchPlaceholder={boards.length > 6 ? "Search boards…" : undefined}
      sections={[
        {
          options: [
            ...(allowAuto
              ? [
                  {
                    value: "auto",
                    label: "Automatic",
                    description: "Your own tasks stay personal; others go on their department's board.",
                  },
                ]
              : []),
            { value: "none", label: "No board", description: "Only the people on the task see it." },
          ],
        },
        { options: boards.map((board) => ({ value: board.id, label: board.name })) },
      ]}
      onSelect={(next) => onChange(next === "none" ? null : next)}
    />
  );
}
