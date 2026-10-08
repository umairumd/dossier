"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  Activity,
  Archive,
  ArchiveRestore,
  Building2,
  CalendarCheck,
  CalendarCheck2,
  CalendarPlus,
  CalendarX2,
  Clock,
  FileCheck,
  Files,
  LayoutTemplate,
  MessageSquare,
  Send,
  Settings2,
  ShieldCheck,
  UserCheck,
  UserPen,
  UserX,
  type LucideIcon,
} from "lucide-react";
import {
  collapseAttendance,
  formatMetaDate,
  getEventLabel,
  getHref,
  isCollapsed,
  leaveTypeLabel,
  metaString,
  type DisplayItem,
  type EventLabel,
} from "@/components/analytics/activity-feed";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardFooterLink,
  CardLabelHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityEventType, ActivityLogEntry } from "@/types/activity";

// Home activity card. Same activity log and permissions as the Activity
// page; only the selection and grouping differ:
// - team/company: each day's report submissions fold into one summary row
//   (not clickable; the hero already covers today's details);
// - every other event keeps its own row with an icon for its scenario;
// - rows are grouped by day in the organisation's time zone, so the server
//   and client render the same thing.

const MAX_ROWS = 6;

const EVENT_ICON: Record<ActivityEventType, LucideIcon> = {
  report_submitted: FileCheck,
  report_commented: MessageSquare,
  attendance_recorded: CalendarCheck,
  leave_approved: CalendarCheck2,
  leave_rejected: CalendarX2,
  accrual_run: CalendarPlus,
  shift_assigned: Clock,
  employee_invited: Send,
  employee_onboarded: UserCheck,
  employee_edited: UserPen,
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
};

export interface ActivityDayTotals {
  /** Organisation date, YYYY-MM-DD. */
  date: string;
  submitted?: number;
  expected?: number;
  missingNames?: string[];
}

export interface ActivityToday {
  /** Organisation date, YYYY-MM-DD. */
  date: string;
  submitted: number;
  expected: number;
  deadlineLabel: string;
  deadlinePassed: boolean;
}

type Row =
  | { kind: "event"; item: DisplayItem; dayKey: string }
  | {
      kind: "digest";
      dayKey: string;
      at: string;
      count: number;
      firstNames: string[];
    };

function firstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

function listNames(names: string[], total: number): string {
  if (names.length === 0) return "";
  const shown = names.slice(0, 3);
  const more = total - shown.length;
  if (more > 0) return `${shown.join(", ")} and ${more} more`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

function personalise(
  entry: ActivityLogEntry,
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

function detailLine(entry: ActivityLogEntry): string | null {
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
    default:
      return null;
  }
}

export function HomeActivityCard({
  mode,
  items,
  timeZone,
  today,
  days = [],
  currentUserId,
  className,
}: {
  mode: "team" | "company" | "personal";
  items: ActivityLogEntry[];
  timeZone: string;
  /** Today's totals (team/company) and the organisation date. */
  today: ActivityToday;
  /** Totals for past days, from the completion trend. */
  days?: ActivityDayTotals[];
  currentUserId?: string;
  className?: string;
}) {
  const formatters = useMemo(
    () => ({
      day: new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      time: new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
      }),
      label: new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    }),
    [timeZone],
  );

  const groups = useMemo(() => {
    const dayKeyOf = (date: Date) => formatters.day.format(date);
    const base = collapseAttendance(items, dayKeyOf);
    const rows: Row[] = [];
    const digests = new Map<string, Extract<Row, { kind: "digest" }>>();

    for (const item of base) {
      const dayKey = dayKeyOf(new Date(item.created_at));
      const isSubmission =
        !isCollapsed(item) && item.event_type === "report_submitted";
      if (mode !== "personal" && isSubmission) {
        const name = firstName(item.actor_name);
        const digest = digests.get(dayKey);
        if (digest) {
          digest.count += 1;
          if (name && !digest.firstNames.includes(name)) digest.firstNames.push(name);
        } else {
          const row: Extract<Row, { kind: "digest" }> = {
            kind: "digest",
            dayKey,
            at: item.created_at,
            count: 1,
            firstNames: name ? [name] : [],
          };
          digests.set(dayKey, row);
          rows.push(row);
        }
        continue;
      }
      rows.push({ kind: "event", item, dayKey });
    }

    const yesterday = new Date(`${today.date}T12:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const out: { key: string; label: string; rows: Row[] }[] = [];
    for (const row of rows.slice(0, MAX_ROWS)) {
      const last = out[out.length - 1];
      if (last && last.key === row.dayKey) {
        last.rows.push(row);
      } else {
        const label =
          row.dayKey === today.date
            ? "Today"
            : row.dayKey === yesterdayKey
              ? "Yesterday"
              : formatters.label.format(new Date(`${row.dayKey}T12:00:00Z`));
        out.push({ key: row.dayKey, label, rows: [row] });
      }
    }
    return out;
  }, [items, mode, today.date, formatters]);

  const totalsByDay = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );

  const title =
    mode === "team"
      ? "Team activity"
      : mode === "company"
        ? "Company activity"
        : "Your activity";

  function digestText(row: Extract<Row, { kind: "digest" }>) {
    const isToday = row.dayKey === today.date;
    const totals = isToday
      ? { submitted: today.submitted, expected: today.expected, missingNames: undefined }
      : totalsByDay.get(row.dayKey);
    const submitted = totals?.submitted ?? row.count;
    const expected = totals?.expected ?? 0;
    const headline =
      expected > 0 && (!isToday || today.deadlinePassed || submitted >= expected)
        ? `${submitted} of ${expected} reports in`
        : `${submitted} ${submitted === 1 ? "report" : "reports"} in`;
    const names = listNames(row.firstNames, Math.max(submitted, row.firstNames.length));

    let detail: string | null = null;
    const remaining = expected - submitted;
    if (isToday && expected > 0 && remaining > 0) {
      detail = today.deadlinePassed
        ? `${remaining} didn't submit`
        : `${remaining} still to come before ${today.deadlineLabel}`;
    } else if (!isToday && totals?.missingNames && totals.missingNames.length > 0) {
      detail = `Missing: ${listNames(totals.missingNames, totals.missingNames.length)}`;
    }
    return { headline, names, detail };
  }

  return (
    <Card className={className}>
      <CardLabelHeader label={title} />
      <CardContent>
        {groups.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Activity className="size-4" />}
            title="No activity yet."
          />
        ) : (
          <div className="flex flex-col">
            {groups.map((group, groupIndex) => (
              <section key={group.key} aria-label={group.label}>
                <h3
                  className={cn(
                    "pb-1 text-xs text-muted-foreground",
                    groupIndex > 0 && "pt-3",
                  )}
                >
                  {group.label}
                </h3>
                <ul className="flex flex-col divide-y divide-foreground/[0.06]">
                  {group.rows.map((row) => {
                    if (row.kind === "digest") {
                      const { headline, names, detail } = digestText(row);
                      return (
                        <li key={`digest-${row.dayKey}`}>
                          <RowShell
                            icon={Files}
                            time={formatters.time.format(new Date(row.at))}
                            text={
                              <>
                                <span className="font-medium text-foreground">
                                  {headline}
                                </span>
                                {names ? ` · ${names}` : null}
                              </>
                            }
                            detail={detail}
                          />
                        </li>
                      );
                    }
                    const { item } = row;
                    if (isCollapsed(item)) {
                      const lead =
                        currentUserId && item.actor_id === currentUserId
                          ? "You"
                          : (item.actor_name ?? "Admin");
                      return (
                        <li key={`attendance-${item.actor_id}-${item.dayKey}`}>
                          <RowShell
                            icon={CalendarCheck}
                            time={formatters.time.format(new Date(item.created_at))}
                            text={
                              <>
                                <span className="font-medium text-foreground">{lead}</span>
                                {` marked attendance for ${item.count} people`}
                              </>
                            }
                          />
                        </li>
                      );
                    }
                    const label = personalise(item, getEventLabel(item), currentUserId);
                    return (
                      <li key={item.id}>
                        <RowShell
                          icon={EVENT_ICON[item.event_type] ?? Activity}
                          href={getHref(item)}
                          time={formatters.time.format(new Date(item.created_at))}
                          text={
                            <>
                              {label.lead ? (
                                <span className="font-medium text-foreground">
                                  {label.lead}
                                </span>
                              ) : null}
                              {label.rest}
                            </>
                          }
                          detail={detailLine(item)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooterLink href="/activity">All activity</CardFooterLink>
    </Card>
  );
}

function RowShell({
  icon: Icon,
  text,
  detail,
  time,
  href,
}: {
  icon: LucideIcon;
  text: ReactNode;
  detail?: string | null;
  time: string;
  href?: string;
}) {
  const body = (
    <>
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-foreground/70 ring-1 ring-inset ring-foreground/10"
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
  const rowClass = "-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5";
  return href ? (
    <Link
      href={href}
      className={cn(
        rowClass,
        "transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={rowClass}>{body}</div>
  );
}
