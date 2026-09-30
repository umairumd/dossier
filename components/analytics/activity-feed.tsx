"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  Archive,
  Building2,
  CalendarCheck,
  FileText,
  Settings,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { MemberAvatar } from "@/components/shared/member-avatar";
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

const DASHBOARD_MAX_ROWS = 8;

/**
 * A label is split so the leading name can be rendered in font-medium:
 * `lead` is the actor (or subject) and `rest` is the remainder of the sentence.
 */
interface EventLabel {
  lead: string;
  rest: string;
}

const EVENT_LABELS: Record<
  ActivityEventType,
  (entry: ActivityLogEntry) => EventLabel
> = {
  employee_invited: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` invited ${e.target_name ?? "someone"}`,
  }),
  employee_onboarded: (e) => ({
    lead: e.target_name ?? "Someone",
    rest: " completed onboarding",
  }),
  employee_edited: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` updated ${e.target_name ?? "someone"}'s profile`,
  }),
  employee_deactivated: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` deactivated ${e.target_name ?? "someone"}`,
  }),
  employee_reactivated: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` reactivated ${e.target_name ?? "someone"}`,
  }),
  employee_archived: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` archived ${e.target_name ?? "someone"}`,
  }),
  employee_restored: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` restored ${e.target_name ?? "someone"}`,
  }),
  department_assigned: (e) => {
    const target = e.target_name ?? "someone";
    const dept = e.entity_name ?? "a department";
    if (e.metadata?.action === "removed") {
      return {
        lead: e.actor_name ?? "Admin",
        rest: ` removed ${target} from ${dept}`,
      };
    }
    return {
      lead: e.actor_name ?? "Admin",
      rest: ` assigned ${target} to ${dept}`,
    };
  },
  supervisor_assigned: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` set ${e.entity_name ?? "someone"} as supervisor for ${e.target_name ?? "someone"}`,
  }),
  template_assigned: (e) => {
    const departmentName =
      typeof e.metadata?.departmentName === "string"
        ? e.metadata.departmentName
        : null;
    const destination =
      departmentName ?? e.target_name ?? e.entity_name ?? "someone";
    const template = e.entity_name ? `the ${e.entity_name} template` : "a template";
    return {
      lead: e.actor_name ?? "Admin",
      rest: ` assigned ${template} to ${destination}`,
    };
  },
  shift_assigned: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` assigned ${e.entity_name ? `a ${e.entity_name} shift` : "a shift"} to ${e.target_name ?? "someone"}`,
  }),
  report_submitted: (e) => {
    const reportDate =
      typeof e.metadata?.reportDate === "string"
        ? e.metadata.reportDate
        : null;
    return {
      lead: e.actor_name ?? "Someone",
      rest: reportDate
        ? ` submitted a report for ${reportDate}`
        : " submitted a report",
    };
  },
  department_created: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` created ${e.entity_name ?? "a"} department`,
  }),
  department_edited: (e) => {
    const action =
      typeof e.metadata?.action === "string" ? e.metadata.action : null;
    const dept = `${e.entity_name ?? "a"} department`;
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
        ? ` permanently deleted ${e.entity_name ?? "a"} department`
        : ` archived ${e.entity_name ?? "a"} department`,
  }),
  attendance_recorded: (e) => {
    const date =
      typeof e.metadata?.date === "string" ? e.metadata.date : null;
    const status =
      typeof e.metadata?.status === "string" ? e.metadata.status : null;
    let rest = ` recorded attendance for ${e.target_name ?? "someone"}`;
    if (date) rest += ` on ${date}`;
    if (status) rest += ` (${status})`;
    return { lead: e.actor_name ?? "Admin", rest };
  },
  leave_approved: (e) => {
    const type =
      typeof e.metadata?.type === "string" ? e.metadata.type : null;
    const date =
      typeof e.metadata?.date === "string" ? e.metadata.date : null;
    const base = ` approved leave for ${e.target_name ?? "someone"}`;
    let rest = base;
    if (type && date) rest = `${base} (${type}, ${date})`;
    else if (date) rest = `${base} (${date})`;
    return { lead: e.actor_name ?? "Admin", rest };
  },
  leave_rejected: (e) => {
    const type =
      typeof e.metadata?.type === "string" ? e.metadata.type : null;
    const date =
      typeof e.metadata?.date === "string" ? e.metadata.date : null;
    const base = ` rejected leave for ${e.target_name ?? "someone"}`;
    let rest = base;
    if (type && date) rest = `${base} (${type}, ${date})`;
    else if (date) rest = `${base} (${date})`;
    return { lead: e.actor_name ?? "Admin", rest };
  },
  accrual_run: (e) => {
    const count = e.metadata?.updatedCount;
    const base = " ran monthly leave accrual";
    return {
      lead: e.actor_name ?? "Admin",
      rest:
        typeof count === "number" ? `${base} (${count} balances updated)` : base,
    };
  },
  org_settings_changed: (e) => {
    const field =
      typeof e.metadata?.field === "string" ? e.metadata.field : null;
    const base = " updated organization settings";
    return {
      lead: e.actor_name ?? "Admin",
      rest: field ? `${base} (${field})` : base,
    };
  },
  template_created: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` created template ${e.entity_name ?? ""}`.trimEnd(),
  }),
  template_edited: (e) => {
    const action =
      typeof e.metadata?.action === "string" ? e.metadata.action : null;
    const verb =
      action === "restored"
        ? "restored"
        : action === "deleted"
          ? "deleted"
          : "updated";
    return {
      lead: e.actor_name ?? "Admin",
      rest: ` ${verb} template ${e.entity_name ?? ""}`.trimEnd(),
    };
  },
  template_archived: (e) => ({
    lead: e.actor_name ?? "Admin",
    rest: ` archived template ${e.entity_name ?? ""}`.trimEnd(),
  }),
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

// --- Day grouping (local time) ---

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

function groupByDay(
  items: ActivityLogEntry[],
): { key: string; label: string; items: ActivityLogEntry[] }[] {
  const now = new Date();
  const groups: { key: string; label: string; items: ActivityLogEntry[] }[] =
    [];
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
  canDelete,
  deleteDisabled,
  onDelete,
}: {
  item: ActivityLogEntry;
  variant: "page" | "dashboard";
  /** Day label is shown above, so the row only needs the time of day. */
  showTimeOnly: boolean;
  canDelete: boolean;
  deleteDisabled: boolean;
  onDelete: (id: string) => void;
}) {
  const Icon = EVENT_ICONS[item.event_type] ?? FileText;
  const category = EVENT_CATEGORY[item.event_type] ?? "settings";
  const labelFn = EVENT_LABELS[item.event_type];
  const label = labelFn
    ? labelFn(item)
    : { lead: "", rest: item.event_type };
  const href = getHref(item);
  const isPage = variant === "page";

  const timestamp = showTimeOnly ? (
    formatLocalTime(item.created_at)
  ) : (
    <LocalDateTime isoString={item.created_at} />
  );

  const avatar =
    item.actor_id && item.actor_name ? (
      <MemberAvatar
        name={item.actor_name}
        userId={item.actor_id}
        size={isPage ? "sm" : "table"}
      />
    ) : null;

  const content = (
    <div
      className={cn(
        "flex items-start gap-3",
        (canDelete || !isPage) && "pr-8",
      )}
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon
          className={cn("size-3.5", CATEGORY_ICON_COLOR[category])}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm">
          {label.lead ? (
            <span className="font-medium">{label.lead}</span>
          ) : null}
          {label.rest}
        </p>
        {isPage ? (
          <p className="text-xs text-muted-foreground">{timestamp}</p>
        ) : (
          <div className="flex items-center gap-2">
            {avatar}
            <p className="text-xs text-muted-foreground">{timestamp}</p>
          </div>
        )}
      </div>
      {isPage && avatar ? <div className="shrink-0">{avatar}</div> : null}
    </div>
  );

  return (
    <li className="group relative">
      {href ? (
        <Link
          href={href}
          className={cn(
            "block rounded-md transition-colors hover:bg-foreground/5",
            isPage ? "-mx-2 px-2 py-2" : "-mx-2 -my-1.5 px-2 py-1.5",
          )}
        >
          {content}
        </Link>
      ) : (
        content
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={deleteDisabled}
          className="absolute right-0 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label="Delete entry"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
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
  const mounted = useIsMounted();
  const isPage = variant === "page";

  const visibleItems = useMemo(
    () => (isPage ? items : items.slice(0, DASHBOARD_MAX_ROWS)),
    [items, isPage],
  );

  // Grouping depends on the viewer's local timezone, so it only runs after
  // mount; the server render and first client render are a flat list.
  const groups = useMemo(
    () => (isPage && mounted ? groupByDay(visibleItems) : null),
    [isPage, mounted, visibleItems],
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
              <ul className="flex flex-col gap-1 pb-4">
                {group.items.map((item) => (
                  <ActivityRow
                    key={item.id}
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
        <ul className={cn("flex flex-col", isPage ? "gap-1" : "gap-3")}>
          {visibleItems.map((item) => (
            <ActivityRow
              key={item.id}
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
