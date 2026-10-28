"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Activity,
  CalendarCheck,
  ChevronDown,
  FileText,
  Files,
  Trash2,
} from "lucide-react";
import {
  ActivityRowShell,
  EVENT_ICON,
  LabelText,
  activityDetailLine,
  eventCategory,
  firstName,
  listNames,
  personaliseLabel,
} from "@/components/analytics/activity-row";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteActivityEntry } from "@/lib/actions/admin/activity";
import { formatLocalTime } from "@/lib/helpers/time";
import { cn } from "@/lib/utils";
import type { ActivityEventType, ActivityLogEntry } from "@/types/activity";
import {
  ATTENDANCE_STATUS_LABELS,
  LEAVE_REQUEST_TYPE_LABELS,
} from "@/types/attendance";

// --- Formatting helpers ---

/** Replace underscores with spaces and capitalize the first letter. */
function capitalizeRaw(val: string): string {
  const spaced = val.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Returns `fallback` for null, undefined, or whitespace-only values. */
function entityName(
  val: string | null | undefined,
  fallback: string,
): string {
  if (!val || val.trim() === "") return fallback;
  return val;
}

/** True when a denormalized name is missing or the literal "none" sentinel. */
function isNoneName(val: string | null | undefined): boolean {
  return !val || val.trim() === "" || val.trim().toLowerCase() === "none";
}

export function metaString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** "2 Sep" (or "2 Sep 2025" when not the current year) for YYYY-MM-DD. */
export function formatMetaDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

// --- Labels ---

/**
 * A label is split so the leading name can be rendered in font-medium:
 * `lead` is the actor (or subject) and `rest` is the remainder of the sentence.
 */
export interface EventLabel {
  lead: string;
  rest: string;
}

function attendanceStatusLabel(status: string | null): string {
  if (!status) return "";
  const known = (ATTENDANCE_STATUS_LABELS as Record<string, string>)[status];
  return known ?? capitalizeRaw(status);
}

export function leaveTypeLabel(type: string | null): string {
  if (!type) return "";
  const known = (LEAVE_REQUEST_TYPE_LABELS as Record<string, string>)[type];
  return known ?? capitalizeRaw(type);
}

function leaveLabel(
  e: ActivityLogEntry,
  verb: "approved" | "rejected",
): EventLabel {
  const typeLabel = leaveTypeLabel(metaString(e.metadata, "type"));
  const date = formatMetaDate(metaString(e.metadata, "date"));
  const details = [typeLabel, date].filter(Boolean).join(", ");
  return {
    lead: e.actor_name ?? "Admin",
    rest: ` ${verb} leave for ${entityName(e.target_name, "someone")}${
      details ? ` (${details})` : ""
    }`,
  };
}

const EVENT_LABELS: Record<
  ActivityEventType,
  (entry: ActivityLogEntry) => EventLabel
> = {
  employee_invited: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` invited ${entityName(e.target_name, "someone")} to Dossier`,
  }),
  employee_onboarded: (e) => ({
    lead: entityName(e.target_name, "Someone"),
    rest: " completed onboarding",
  }),
  employee_edited: (e) => {
    if (metaString(e.metadata, "field") === "contract_start") {
      return {
        lead: e.actor_name ?? "Admin",
        rest: ` updated ${entityName(e.target_name, "someone")}'s contract start`,
      };
    }
    return {
      lead: e.actor_name ?? "Admin",
      rest: ` updated ${entityName(e.target_name, "someone")}'s profile`,
    };
  },
  record_exported: (e) =>
    e.metadata?.kind === "attendance_sheet"
      ? {
          lead: e.actor_name ?? "Admin",
          rest: ` exported the attendance sheet for ${entityName(e.entity_name, "a month")}`,
        }
      : {
          lead: e.actor_name ?? "Admin",
          rest: ` exported ${entityName(e.target_name, "someone")}'s record`,
        },
  employee_deactivated: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` deactivated ${entityName(e.target_name, "someone")}`,
  }),
  employee_reactivated: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` reactivated ${entityName(e.target_name, "someone")}`,
  }),
  employee_archived: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` archived ${entityName(e.target_name, "someone")}`,
  }),
  employee_restored: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` restored ${entityName(e.target_name, "someone")}`,
  }),
  department_assigned: (e) => {
    const lead = e.actor_name ?? "Admin";
    const target = entityName(e.target_name, "someone");
    const rawDept = e.entity_name ?? "";
    // The bulk edit in employees.ts logs one entry with comma-joined (or
    // "none") department names plus a departmentIds array in metadata.
    const isBulk =
      Array.isArray(e.metadata?.departmentIds) || rawDept.includes(",");
    if (isBulk) {
      return { lead, rest: ` updated department assignments for ${target}` };
    }
    const dept = entityName(e.entity_name, "a department");
    if (e.metadata?.action === "removed") {
      return { lead, rest: ` removed ${target} from ${dept}` };
    }
    return { lead, rest: ` assigned ${target} to ${dept}` };
  },
  supervisor_assigned: (e) => {
    const lead = e.actor_name ?? "Admin";
    const target = entityName(e.target_name, "someone");
    if (isNoneName(e.entity_name)) {
      return { lead, rest: ` removed all supervisors from ${target}` };
    }
    return {
      lead,
      rest: ` set ${entityName(e.entity_name, "someone")} as supervisor for ${target}`,
    };
  },
  template_assigned: (e) => {
    const lead = e.actor_name ?? "Admin";
    const target = entityName(e.target_name, "someone");
    const departmentName =
      metaString(e.metadata, "departmentName") ??
      metaString(e.metadata, "department");

    if (isNoneName(e.entity_name)) {
      const from = departmentName ? `${departmentName} department` : target;
      return { lead, rest: ` removed the template assignment from ${from}` };
    }
    const template = `${entityName(e.entity_name, "a")} template`;
    if (departmentName) {
      return {
        lead,
        rest: ` assigned ${template} to ${departmentName} department`,
      };
    }
    return { lead, rest: ` assigned ${template} to ${target}` };
  },
  shift_assigned: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` assigned a shift to ${entityName(e.target_name, "someone")}`,
  }),
  report_submitted: (e) => ({
    lead: e.actor_name ?? "Someone",
    rest: " submitted their report",
  }),
  report_commented: (e) => ({
    lead: e.actor_name ?? "Someone",
    rest: ` commented on ${entityName(e.target_name, "someone")}'s report`,
  }),
  department_created: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` created ${entityName(e.entity_name, "a")} department`,
  }),
  department_edited: (e) => {
    const action = metaString(e.metadata, "action");
    const dept = `${entityName(e.entity_name, "a")} department`;
    const lead = e.actor_name ?? "Admin";
    if (action === "manager_assigned") {
      return { lead, rest: ` assigned a manager to ${dept}` };
    }
    if (action === "manager_unassigned") {
      return { lead, rest: ` unassigned the manager from ${dept}` };
    }
    if (action === "restored") {
      return { lead, rest: ` restored ${dept}` };
    }
    return { lead, rest: ` updated ${dept}` };
  },
  department_archived: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest:
      e.metadata?.action === "permanently_deleted"
        ? ` permanently deleted ${entityName(e.entity_name, "a")} department`
        : ` archived ${entityName(e.entity_name, "a")} department`,
  }),
  attendance_recorded: (e) => {
    const target = entityName(e.target_name, "someone");
    const status = attendanceStatusLabel(metaString(e.metadata, "status"));
    const date = formatMetaDate(metaString(e.metadata, "date"));
    let rest = ` marked ${target}'s attendance`;
    if (status) rest += ` as ${status}`;
    if (date) rest += ` on ${date}`;
    return { lead: e.actor_name ?? "Admin", rest };
  },
  leave_approved: (e) => leaveLabel(e, "approved"),
  leave_rejected: (e) => leaveLabel(e, "rejected"),
  leave_balance_adjusted: (e) => {
    const days = Number(e.metadata?.adjustment);
    const amount = Number.isFinite(days)
      ? ` by ${days > 0 ? "+" : ""}${days} day${Math.abs(days) === 1 ? "" : "s"}`
      : "";
    return {
      lead: e.actor_name ?? "Admin",
      rest: ` adjusted ${entityName(e.target_name, "someone")}'s leave balance${amount}`,
    };
  },
  leave_year_encashed: (e) => {
    const days = Number(e.metadata?.encashed_days);
    const amount = Number.isFinite(days)
      ? ` (${days} day${days === 1 ? "" : "s"})`
      : "";
    return {
      lead: entityName(e.target_name, "Someone"),
      rest: `'s leave year ended${amount}`,
    };
  },
  accrual_run: (e) => {
    const count = e.metadata?.count;
    return {
      lead: e.actor_name ?? "Admin",
      rest:
        typeof count === "number"
          ? ` ran leave accrual, ${count} balances updated`
          : " ran leave accrual",
    };
  },
  org_settings_changed: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` updated ${capitalizeRaw(metaString(e.metadata, "field") ?? "org settings")}`,
  }),
  template_created: (e) => {
    const name = entityName(e.entity_name, "");
    return {
      lead: e.actor_name ?? "Admin",
      rest: name ? ` created template ${name}` : " created a template",
    };
  },
  template_edited: (e) => {
    const action = metaString(e.metadata, "action");
    const verb =
      action === "restored"
        ? "restored"
        : action === "deleted"
          ? "deleted"
          : "updated";
    const name = entityName(e.entity_name, "");
    return {
      lead: e.actor_name ?? "Admin",
      rest: name ? ` ${verb} template ${name}` : ` ${verb} a template`,
    };
  },
  template_archived: (e) => {
    const name = entityName(e.entity_name, "");
    return {
      lead: e.actor_name ?? "Admin",
      rest: name ? ` archived template ${name}` : " archived a template",
    };
  },
  item_awarded: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` awarded ${entityName(e.target_name, "someone")} the ${entityName(e.entity_name, "an item")}`,
  }),
  item_revoked: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` took back ${entityName(e.target_name, "someone")}'s ${entityName(e.entity_name, "item")}`,
  }),
  handbook_published: (e) => {
    if (e.metadata?.launch) {
      return { lead: e.actor_name ?? "Admin", rest: " launched the handbook for everyone" };
    }
    const name = entityName(e.entity_name, "a handbook document");
    const version = Number(e.metadata?.version);
    return {
      lead: e.actor_name ?? "Admin",
      rest:
        Number.isFinite(version) && version > 1
          ? ` published version ${version} of ${name}`
          : ` published ${name}`,
    };
  },
};

export function getHref(entry: ActivityLogEntry): string | undefined {
  if (entry.target_id) {
    return `/employees/${entry.target_id}`;
  }
  if (entry.entity_type === "department" && entry.entity_id) {
    return `/departments/${entry.entity_id}`;
  }
  if (entry.entity_type === "template" && entry.entity_id) {
    return `/organization/templates/${entry.entity_id}`;
  }
  if (entry.entity_type === "attendance_sheet") {
    const month = typeof entry.metadata?.month === "string" ? entry.metadata.month : "";
    return month ? `/attendance?month=${month}` : "/attendance";
  }
  if (entry.entity_type === "handbook") {
    return "/handbook";
  }
  if (entry.entity_type === "handbook_doc" && entry.entity_id) {
    return `/organization/handbook/${entry.entity_id}`;
  }
  return undefined;
}

/** Sentence for one activity entry, split so the lead name can be bold. */
export function getEventLabel(entry: ActivityLogEntry): EventLabel {
  const labelFn = EVENT_LABELS[entry.event_type];
  return labelFn ? labelFn(entry) : { lead: "", rest: entry.event_type };
}

// --- Day keys and grouping (organisation time zone) ---
//
// Days and clock times use the organisation's time zone rather than the
// browser's, so the server can render the grouped feed and the list arrives
// filled in instead of waiting for the page's JavaScript.

export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type FeedFormatters = {
  dayKey: (date: Date) => string;
  time: (iso: string) => string;
  dayLabel: (dayKey: string) => string;
};

function previousDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function makeFormatters(timeZone: string, todayKey: string): FeedFormatters {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  // Day keys are calendar dates already, so the label formats them as UTC.
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const yesterdayKey = previousDayKey(todayKey);
  const thisYear = todayKey.slice(0, 4);

  return {
    dayKey: (date) => day.format(date),
    time: (iso) => time.format(new Date(iso)),
    dayLabel: (key) => {
      if (key === todayKey) return "Today";
      if (key === yesterdayKey) return "Yesterday";
      const parts = label.formatToParts(new Date(`${key}T00:00:00Z`));
      const get = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "";
      const base = `${get("weekday")} ${get("day")} ${get("month")}`;
      return key.slice(0, 4) === thisYear ? base : `${base} ${key.slice(0, 4)}`;
    },
  };
}

const FeedFormattersContext = createContext<FeedFormatters | null>(null);

function useFeedTime(iso: string): string {
  const formatters = useContext(FeedFormattersContext);
  return formatters ? formatters.time(iso) : formatLocalTime(iso);
}

// --- Attendance collapsing ---

export interface CollapsedAttendance {
  type: "collapsed_attendance";
  actor_id: string;
  actor_name: string | null;
  dayKey: string;
  count: number;
  created_at: string;
}

export type DisplayItem = ActivityLogEntry | CollapsedAttendance;

export function isCollapsed(item: DisplayItem): item is CollapsedAttendance {
  return "type" in item && item.type === "collapsed_attendance";
}

function displayKey(item: DisplayItem): string {
  return isCollapsed(item)
    ? `collapsed-${item.actor_id}-${item.dayKey}`
    : item.id;
}

/**
 * Collapse attendance_recorded entries logged by the same actor on the same
 * local calendar day into one row, when they touch 2+ distinct employees.
 * The collapsed row sits where the group's latest entry was; order of all
 * other items is preserved.
 */
export function collapseAttendance(
  items: ActivityLogEntry[],
  dayKeyOf: (date: Date) => string = localDayKey,
): DisplayItem[] {
  const groups = new Map<
    string,
    { dayKey: string; entries: ActivityLogEntry[] }
  >();

  for (const item of items) {
    if (item.event_type !== "attendance_recorded" || !item.actor_id) continue;
    const dayKey = dayKeyOf(new Date(item.created_at));
    const key = `${item.actor_id}|${dayKey}`;
    const group = groups.get(key);
    if (group) {
      group.entries.push(item);
    } else {
      groups.set(key, { dayKey, entries: [item] });
    }
  }

  const collapsedAtLatest = new Map<string, CollapsedAttendance>();
  const dropped = new Set<string>();

  for (const { dayKey, entries } of groups.values()) {
    const targets = new Set<string>();
    for (const entry of entries) {
      if (entry.target_id) targets.add(entry.target_id);
    }
    if (targets.size < 2) continue;

    const latest = entries.reduce((a, b) =>
      new Date(b.created_at).getTime() > new Date(a.created_at).getTime()
        ? b
        : a,
    );
    collapsedAtLatest.set(latest.id, {
      type: "collapsed_attendance",
      actor_id: latest.actor_id as string,
      actor_name: latest.actor_name,
      dayKey,
      count: targets.size,
      created_at: latest.created_at,
    });
    for (const entry of entries) {
      if (entry.id !== latest.id) dropped.add(entry.id);
    }
  }

  if (collapsedAtLatest.size === 0) return items;

  const result: DisplayItem[] = [];
  for (const item of items) {
    const collapsed = collapsedAtLatest.get(item.id);
    if (collapsed) {
      result.push(collapsed);
    } else if (!dropped.has(item.id)) {
      result.push(item);
    }
  }
  return result;
}

// --- Folding report submissions (team / company views) ---

type FeedRow =
  | { kind: "item"; item: DisplayItem; dayKey: string }
  | {
      kind: "digest";
      dayKey: string;
      at: string;
      entries: ActivityLogEntry[];
    };

/** Each day's report submissions become one expandable row. */
function toFeedRows(
  items: DisplayItem[],
  fold: boolean,
  dayKeyOf: (date: Date) => string,
): FeedRow[] {
  const rows: FeedRow[] = [];
  const digests = new Map<string, Extract<FeedRow, { kind: "digest" }>>();
  for (const item of items) {
    const dayKey = dayKeyOf(new Date(item.created_at));
    if (fold && !isCollapsed(item) && item.event_type === "report_submitted") {
      const existing = digests.get(dayKey);
      if (existing) {
        existing.entries.push(item);
        continue;
      }
      const digest = {
        kind: "digest" as const,
        dayKey,
        at: item.created_at,
        entries: [item],
      };
      digests.set(dayKey, digest);
      rows.push(digest);
      continue;
    }
    rows.push({ kind: "item", item, dayKey });
  }
  // A single submission reads better as a normal row.
  return rows.map((row) =>
    row.kind === "digest" && row.entries.length === 1
      ? { kind: "item", item: row.entries[0], dayKey: row.dayKey }
      : row,
  );
}

function groupRowsByDay(
  rows: FeedRow[],
  dayLabel: (dayKey: string) => string,
): { key: string; label: string; rows: FeedRow[] }[] {
  const groups: { key: string; label: string; rows: FeedRow[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.key === row.dayKey) {
      last.rows.push(row);
    } else {
      groups.push({
        key: row.dayKey,
        label: dayLabel(row.dayKey),
        rows: [row],
      });
    }
  }
  return groups;
}

// --- Rows ---

interface RowControls {
  currentUserId?: string;
  canDelete: boolean;
  deleteDisabled: boolean;
  onDelete: (id: string) => void;
}

function DeleteSlot({
  id,
  canDelete,
  deleteDisabled,
  onDelete,
}: {
  id: string | null;
} & Omit<RowControls, "currentUserId">) {
  if (!canDelete) return null;
  return (
    <span className="flex size-7 shrink-0 items-center justify-center">
      {id ? (
        <button
          type="button"
          onClick={() => onDelete(id)}
          disabled={deleteDisabled}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100"
          aria-label="Delete entry"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

function EntryRow({ item, ...controls }: { item: DisplayItem } & RowControls) {
  const time = useFeedTime(item.created_at);
  if (isCollapsed(item)) {
    const lead =
      controls.currentUserId && item.actor_id === controls.currentUserId
        ? "You"
        : (item.actor_name ?? "Admin");
    return (
      <ActivityRowShell
        icon={CalendarCheck}
        category="attendance"
        time={time}
        text={
          <LabelText
            label={{ lead, rest: ` marked attendance for ${item.count} people` }}
          />
        }
        trailing={<DeleteSlot id={null} {...controls} />}
      />
    );
  }
  const label = personaliseLabel(item, getEventLabel(item), controls.currentUserId);
  return (
    <ActivityRowShell
      icon={EVENT_ICON[item.event_type] ?? FileText}
      category={eventCategory(item.event_type)}
      href={getHref(item)}
      time={time}
      text={<LabelText label={label} />}
      detail={activityDetailLine(item)}
      trailing={<DeleteSlot id={item.id} {...controls} />}
    />
  );
}

function DigestRow({
  row,
  ...controls
}: { row: Extract<FeedRow, { kind: "digest" }> } & RowControls) {
  const [open, setOpen] = useState(false);
  const time = useFeedTime(row.at);
  const count = row.entries.length;
  const names: string[] = [];
  for (const entry of row.entries) {
    const name = firstName(entry.actor_name);
    if (name && !names.includes(name)) names.push(name);
  }
  return (
    <>
      <ActivityRowShell
        icon={Files}
        category="reports"
        time={time}
        onClick={() => setOpen((value) => !value)}
        expanded={open}
        text={
          <>
            <span className="font-medium text-foreground">
              {count} reports submitted
            </span>
            {` · ${listNames(names, count)}`}
            <ChevronDown
              aria-hidden
              className={cn(
                "ml-1.5 inline size-3.5 align-[-2px] text-muted-foreground transition-transform group-hover/row:text-foreground",
                open && "rotate-180",
              )}
            />
            <span className="sr-only">
              {open ? "Hide these reports" : "Show these reports"}
            </span>
          </>
        }
        trailing={<DeleteSlot id={null} {...controls} />}
      />
      {open ? (
        <ul className="ml-11 flex flex-col divide-y divide-line border-l border-edge pl-3">
          {row.entries.map((entry) => (
            <li key={entry.id}>
              <EntryRow item={entry} {...controls} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function ActivityFeed({
  items,
  emptyMessage = "No recent activity.",
  canDelete = false,
  currentUserId,
  foldReports = false,
  footer,
  timeZone,
  todayKey,
}: {
  items: ActivityLogEntry[];
  emptyMessage?: string;
  canDelete?: boolean;
  /** Shows "You" for the viewer's own actions. */
  currentUserId?: string;
  /** Fold each day's report submissions into one expandable row. */
  foldReports?: boolean;
  footer?: ReactNode;
  /** The organisation's time zone; days and times are shown in it. */
  timeZone: string;
  /** Today in that time zone, YYYY-MM-DD. */
  todayKey: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const formatters = useMemo(
    () => makeFormatters(timeZone, todayKey),
    [timeZone, todayKey],
  );

  const groups = useMemo(
    () =>
      groupRowsByDay(
        toFeedRows(
          collapseAttendance(items, formatters.dayKey),
          foldReports,
          formatters.dayKey,
        ),
        formatters.dayLabel,
      ),
    [items, foldReports, formatters],
  );

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteActivityEntry(id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete entry.");
      }
      setPendingDeleteId(null);
    });
  };

  if (items.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Activity className="size-4" />}
        title={emptyMessage}
      />
    );
  }

  const controls: RowControls = {
    currentUserId,
    canDelete,
    deleteDisabled: isPending,
    onDelete: setPendingDeleteId,
  };

  return (
    <FeedFormattersContext.Provider value={formatters}>
      <div className="flex flex-col">
        {groups.map((group, index) => (
          <section key={group.key} aria-label={group.label}>
            <h3
              className={cn(
                "pb-1 text-xs text-muted-foreground",
                index > 0 && "pt-4",
              )}
            >
              {group.label}
            </h3>
            <ul className="flex flex-col divide-y divide-line">
              {group.rows.map((row) => (
                <li
                  key={
                    row.kind === "digest"
                      ? `digest-${row.dayKey}`
                      : displayKey(row.item)
                  }
                >
                  {row.kind === "digest" ? (
                    <DigestRow row={row} {...controls} />
                  ) : (
                    <EntryRow item={row.item} {...controls} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {footer}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setPendingDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete activity entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the entry from the activity log. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || !pendingDeleteId}
              onClick={() => {
                if (pendingDeleteId) {
                  handleDelete(pendingDeleteId);
                }
              }}
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FeedFormattersContext.Provider>
  );
}
