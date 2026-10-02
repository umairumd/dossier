"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  Archive,
  Building2,
  CalendarCheck,
  FileText,
  MessageSquare,
  Settings,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalDateTime } from "@/components/shared/local-datetime";
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
import {
  CATEGORY_ICON_COLOR,
  EVENT_CATEGORY,
} from "@/lib/helpers/activity-categories";
import { formatLocalTime } from "@/lib/helpers/time";
import { cn } from "@/lib/utils";
import type { ActivityEventType, ActivityLogEntry } from "@/types/activity";
import {
  ATTENDANCE_STATUS_LABELS,
  LEAVE_REQUEST_TYPE_LABELS,
} from "@/types/attendance";

const DASHBOARD_MAX_ROWS = 8;
const RELATIVE_TICK_MS = 30_000;

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

function metaString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** "2 Sep" (or "2 Sep 2025" when not the current year) for YYYY-MM-DD. */
function formatMetaDate(iso: string | null | undefined): string {
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

function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso);
  const diffSeconds = Math.max(0, Math.floor((now - then.getTime()) / 1000));
  if (diffSeconds < 60) return "Just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  if (then.getFullYear() !== new Date(now).getFullYear()) {
    options.year = "numeric";
  }
  return new Intl.DateTimeFormat("en-GB", options).format(then);
}

// --- Labels ---

/**
 * A label is split so the leading name can be rendered in font-medium:
 * `lead` is the actor (or subject) and `rest` is the remainder of the sentence.
 */
interface EventLabel {
  lead: string;
  rest: string;
}

function attendanceStatusLabel(status: string | null): string {
  if (!status) return "";
  const known = (ATTENDANCE_STATUS_LABELS as Record<string, string>)[status];
  return known ?? capitalizeRaw(status);
}

function leaveTypeLabel(type: string | null): string {
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
  employee_edited: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` updated ${entityName(e.target_name, "someone")}'s profile`,
  }),
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
  accrual_run: (e) => {
    const count = e.metadata?.count;
    return {
      lead: e.actor_name ?? "Admin",
      rest:
        typeof count === "number"
          ? ` ran leave accrual — ${count} balances updated`
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
};

const EVENT_ICONS: Record<ActivityEventType, typeof UserPlus> = {
  employee_invited: UserPlus,
  employee_onboarded: UserCheck,
  employee_edited: Users,
  employee_deactivated: Archive,
  employee_reactivated: UserCheck,
  employee_archived: Archive,
  employee_restored: UserCheck,
  department_assigned: Building2,
  supervisor_assigned: Users,
  template_assigned: FileText,
  shift_assigned: CalendarCheck,
  report_submitted: FileText,
  report_commented: MessageSquare,
  department_created: Building2,
  department_edited: Building2,
  department_archived: Archive,
  attendance_recorded: CalendarCheck,
  leave_approved: CalendarCheck,
  leave_rejected: CalendarCheck,
  accrual_run: CalendarCheck,
  org_settings_changed: Settings,
  template_created: FileText,
  template_edited: FileText,
  template_archived: Archive,
};

function getHref(entry: ActivityLogEntry): string | undefined {
  if (entry.target_id) {
    return `/employees/${entry.target_id}`;
  }
  if (entry.entity_type === "department" && entry.entity_id) {
    return `/departments/${entry.entity_id}`;
  }
  if (entry.entity_type === "template" && entry.entity_id) {
    return `/organization/templates/${entry.entity_id}`;
  }
  return undefined;
}

// --- Day keys and grouping (local time) ---

function subscribe() {
  return () => {};
}

function useIsMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayLabel(date: Date, now: Date): string {
  const todayKey = localDayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const key = localDayKey(date);
  if (key === todayKey) return "Today";
  if (key === localDayKey(yesterday)) return "Yesterday";

  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const base = `${get("weekday")} ${get("day")} ${get("month")}`;
  return date.getFullYear() === now.getFullYear()
    ? base
    : `${base} ${date.getFullYear()}`;
}

// --- Attendance collapsing ---

interface CollapsedAttendance {
  type: "collapsed_attendance";
  actor_id: string;
  actor_name: string | null;
  dayKey: string;
  count: number;
  created_at: string;
}

type DisplayItem = ActivityLogEntry | CollapsedAttendance;

function isCollapsed(item: DisplayItem): item is CollapsedAttendance {
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
function collapseAttendance(items: ActivityLogEntry[]): DisplayItem[] {
  const groups = new Map<
    string,
    { dayKey: string; entries: ActivityLogEntry[] }
  >();

  for (const item of items) {
    if (item.event_type !== "attendance_recorded" || !item.actor_id) continue;
    const dayKey = localDayKey(new Date(item.created_at));
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

function groupByDay(
  items: DisplayItem[],
): { key: string; label: string; items: DisplayItem[] }[] {
  const now = new Date();
  const groups: { key: string; label: string; items: DisplayItem[] }[] = [];
  for (const item of items) {
    const date = new Date(item.created_at);
    const key = localDayKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label: formatDayLabel(date, now), items: [item] });
    }
  }
  return groups;
}

// --- Row ---

function ActivityRow({
  item,
  variant,
  showTimeOnly,
  now,
  canDelete,
  deleteDisabled,
  onDelete,
}: {
  item: DisplayItem;
  variant: "page" | "dashboard";
  /** Page variant: day label is shown above, so the row only needs the time. */
  showTimeOnly: boolean;
  /** Dashboard variant: current time for relative labels; null before mount. */
  now: number | null;
  canDelete: boolean;
  deleteDisabled: boolean;
  onDelete: (id: string) => void;
}) {
  const isPage = variant === "page";
  const collapsed = isCollapsed(item);

  const Icon = collapsed
    ? CalendarCheck
    : (EVENT_ICONS[item.event_type] ?? FileText);
  const category = collapsed
    ? "attendance"
    : (EVENT_CATEGORY[item.event_type] ?? "settings");

  let label: EventLabel;
  if (collapsed) {
    label = {
      lead: item.actor_name ?? "Admin",
      rest: ` marked ${item.count} employees' attendance`,
    };
  } else {
    const labelFn = EVENT_LABELS[item.event_type];
    label = labelFn ? labelFn(item) : { lead: "", rest: item.event_type };
  }

  const href = collapsed ? undefined : getHref(item);
  const rowCanDelete = canDelete && !collapsed;

  // Collapsed rows use the same time formats as normal rows: clock time on
  // the page (latest entry in the group), relative time on the dashboard.
  let timestamp: ReactNode;
  if (isPage) {
    timestamp =
      collapsed || showTimeOnly
        ? formatLocalTime(item.created_at)
        : <LocalDateTime isoString={item.created_at} />;
  } else if (now !== null) {
    timestamp = formatRelativeTime(item.created_at, now);
  } else {
    timestamp = null;
  }

  // [Icon 14px] [Text] [Time]: one line per row, identical height. Hover lives
  // on the row container (not the Link) so every row highlights. Linked text
  // uses display:contents so icon/text/time stay direct flex siblings.
  const text = (
    <p className="min-w-0 flex-1 truncate text-sm leading-snug">
      {label.lead ? (
        <span className="font-medium">{label.lead}</span>
      ) : null}
      {label.rest}
    </p>
  );

  return (
    <li className="group relative">
      <div
        className={cn(
          "-mx-2 flex min-h-0 items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-foreground/5",
          href ? "cursor-pointer" : "cursor-default",
        )}
      >
        {href ? (
          <Link href={href} className="contents">
            <Icon
              className={cn(
                "mt-px h-3.5 w-3.5 shrink-0",
                CATEGORY_ICON_COLOR[category],
              )}
            />
            {text}
          </Link>
        ) : (
          <>
            <Icon
              className={cn(
                "mt-px h-3.5 w-3.5 shrink-0",
                CATEGORY_ICON_COLOR[category],
              )}
            />
            {text}
          </>
        )}
        <span className="ml-auto w-20 shrink-0 self-center whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
          {timestamp}
        </span>
        {/* Spacer matching delete button width — keeps the time column
            aligned when canDelete is on, including collapsed rows. */}
        {canDelete ? (
          <span className="flex size-7 shrink-0 items-center justify-center">
            {rowCanDelete ? (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                disabled={deleteDisabled}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Delete entry"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function ActivityFeed({
  items,
  emptyMessage = "No recent activity.",
  canDelete = false,
  variant = "dashboard",
}: {
  items: ActivityLogEntry[];
  emptyMessage?: string;
  canDelete?: boolean;
  variant?: "page" | "dashboard";
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const mounted = useIsMounted();
  const isPage = variant === "page";

  // Relative timestamps (dashboard only): tick every 30s.
  useEffect(() => {
    if (variant !== "dashboard") return;
    // setState only inside timer callbacks (not synchronously in the effect
    // body): the first tick fires immediately after mount.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), RELATIVE_TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [variant]);

  // Collapsing and day grouping depend on the viewer's local timezone, so
  // they only run after mount; the server render and first client render use
  // the raw items.
  const displayItems = useMemo<DisplayItem[]>(() => {
    const base: DisplayItem[] = mounted ? collapseAttendance(items) : items;
    return isPage ? base : base.slice(0, DASHBOARD_MAX_ROWS);
  }, [items, mounted, isPage]);

  const groups = useMemo(
    () => (isPage && mounted ? groupByDay(displayItems) : null),
    [isPage, mounted, displayItems],
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

  const rowProps = {
    variant,
    now,
    canDelete,
    deleteDisabled: isPending,
    onDelete: setPendingDeleteId,
  } as const;

  return (
    <>
      {groups ? (
        <div className="flex flex-col">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col">
              <h3 className="sticky top-0 z-10 -mx-2 bg-card px-2 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <ul className="flex flex-col pb-4">
                {group.items.map((item) => (
                  <ActivityRow
                    key={displayKey(item)}
                    item={item}
                    showTimeOnly
                    {...rowProps}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col">
          {displayItems.map((item) => (
            <ActivityRow
              key={displayKey(item)}
              item={item}
              showTimeOnly={false}
              {...rowProps}
            />
          ))}
        </ul>
      )}

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
    </>
  );
}
