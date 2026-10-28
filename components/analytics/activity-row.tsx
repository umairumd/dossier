"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarCheck2,
  CalendarPlus,
  CalendarX2,
  Clock,
  Scale,
  FileCheck,
  LayoutTemplate,
  MessageSquare,
  Send,
  Settings2,
  ShieldCheck,
  UserCheck,
  UserPen,
  FileDown,
  UserX,
  type LucideIcon,
} from "lucide-react";
import {
  formatMetaDate,
  leaveTypeLabel,
  metaString,
  type EventLabel,
} from "@/components/analytics/activity-feed";
import {
  CATEGORY_TONE,
  EVENT_CATEGORY,
  type ActivityCategory,
} from "@/lib/helpers/activity-categories";
import { cn } from "@/lib/utils";
import type { ActivityEventType, ActivityLogEntry } from "@/types/activity";

// Shared row for the home activity card and the Activity page: an icon chip
// for the event's scenario (tinted by its kind), the sentence, an optional
// muted detail line, the time, and an optional trailing control.

export const EVENT_ICON: Record<ActivityEventType, LucideIcon> = {
  report_submitted: FileCheck,
  report_commented: MessageSquare,
  attendance_recorded: CalendarCheck,
  leave_approved: CalendarCheck2,
  leave_rejected: CalendarX2,
  accrual_run: CalendarPlus,
  leave_balance_adjusted: Scale,
  leave_year_encashed: Scale,
  shift_assigned: Clock,
  employee_invited: Send,
  employee_onboarded: UserCheck,
  employee_edited: UserPen,
  record_exported: FileDown,
  employee_deactivated: UserX,
  employee_reactivated: UserCheck,
  employee_archived: Archive,
  employee_restored: ArchiveRestore,
  department_assigned: Building2,
  supervisor_assigned: ShieldCheck,
  template_assigned: LayoutTemplate,
  template_created: LayoutTemplate,
  template_edited: LayoutTemplate,
  template_archived: Archive,
  department_created: Building2,
  department_edited: Building2,
  department_archived: Archive,
  org_settings_changed: Settings2,
  handbook_published: BookOpen,
};

export function eventCategory(type: ActivityEventType): ActivityCategory {
  return EVENT_CATEGORY[type] ?? "settings";
}

/** "You" for the viewer, "your report" for things done to the viewer. */
export function personaliseLabel(
  entry: Pick<ActivityLogEntry, "actor_id" | "target_id" | "target_name">,
  label: EventLabel,
  currentUserId?: string,
): EventLabel {
  if (!currentUserId) return label;
  let { lead, rest } = label;
  if (entry.actor_id === currentUserId) {
    lead = "You";
    rest = rest.replace(" their report", " your report");
  }
  if (entry.target_id === currentUserId && entry.target_name) {
    const name = entry.target_name;
    if (lead === name) {
      lead = "You";
    } else {
      rest = rest
        .replace(`${name}'s`, "your")
        .replace(`for ${name}`, "for you")
        .replace(name, "you");
    }
  }
  return { lead, rest };
}

/** Second line: comment preview, or leave type and date. */
export function activityDetailLine(entry: ActivityLogEntry): string | null {
  switch (entry.event_type) {
    case "report_commented": {
      const preview = metaString(entry.metadata, "preview");
      return preview ? `“${preview}”` : null;
    }
    case "leave_approved":
    case "leave_rejected": {
      const type = leaveTypeLabel(metaString(entry.metadata, "type"));
      const date = formatMetaDate(metaString(entry.metadata, "date"));
      return [type, date].filter(Boolean).join(", ") || null;
    }
    case "leave_balance_adjusted": {
      const note = metaString(entry.metadata, "note");
      return note ? `“${note}”` : null;
    }
    case "record_exported":
      return metaString(entry.metadata, "period");
    case "handbook_published": {
      const note = metaString(entry.metadata, "change_note");
      return note ? `“${note}”` : null;
    }
    default:
      return null;
  }
}

export function firstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

/** "Bushra, Wasif, Umer and 2 more" / "Bushra and Wasif". */
export function listNames(names: string[], total: number): string {
  if (names.length === 0) return "";
  const shown = names.slice(0, 3);
  const more = total - shown.length;
  if (more > 0) return `${shown.join(", ")} and ${more} more`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

export function LabelText({ label }: { label: EventLabel }) {
  return (
    <>
      {label.lead ? (
        <span className="font-medium text-foreground">{label.lead}</span>
      ) : null}
      {label.rest}
    </>
  );
}

export function ActivityRowShell({
  icon: Icon,
  category,
  text,
  detail,
  time,
  href,
  onClick,
  expanded,
  trailing,
  className,
}: {
  icon: LucideIcon;
  category: ActivityCategory;
  text: ReactNode;
  detail?: ReactNode;
  time: ReactNode;
  href?: string;
  /** Makes the row a button (e.g. expanding a day's submissions). */
  onClick?: () => void;
  expanded?: boolean;
  trailing?: ReactNode;
  className?: string;
}) {
  const interactive = Boolean(href || onClick);
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          CATEGORY_TONE[category],
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-muted-foreground">{text}</span>
        {detail ? (
          <span className="truncate text-xs text-muted-foreground/80">{detail}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {time}
      </span>
    </>
  );
  const rowClass = "flex min-w-0 flex-1 items-center gap-3 py-2.5";
  return (
    <div
      className={cn(
        "group/row -mx-2 flex items-center gap-2 rounded-lg px-2",
        interactive && "transition-colors hover:bg-fill-hover",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          className={cn(
            rowClass,
            "rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          {body}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-expanded={expanded}
          className={cn(
            rowClass,
            "rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          {body}
        </button>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
      {trailing}
    </div>
  );
}
