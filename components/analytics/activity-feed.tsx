"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
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
import { LocalDateTime } from "@/components/shared/local-datetime";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { deleteActivityEntry } from "@/lib/actions/admin/activity";
import type { ActivityEventType, ActivityLogEntry } from "@/types/activity";

const EVENT_LABELS: Record<
  ActivityEventType,
  (entry: ActivityLogEntry) => string
> = {
  employee_invited: (e) =>
    `${e.actor_name ?? "Admin"} invited ${e.target_name ?? "someone"}`,
  employee_onboarded: (e) =>
    `${e.target_name ?? "Someone"} completed onboarding`,
  employee_edited: (e) =>
    `${e.actor_name ?? "Admin"} updated ${e.target_name ?? "someone"}'s profile`,
  employee_deactivated: (e) =>
    `${e.actor_name ?? "Admin"} deactivated ${e.target_name ?? "someone"}`,
  employee_reactivated: (e) =>
    `${e.actor_name ?? "Admin"} reactivated ${e.target_name ?? "someone"}`,
  employee_archived: (e) =>
    `${e.actor_name ?? "Admin"} archived ${e.target_name ?? "someone"}`,
  employee_restored: (e) =>
    `${e.actor_name ?? "Admin"} restored ${e.target_name ?? "someone"}`,
  department_assigned: (e) =>
    `${e.target_name ?? "Someone"} assigned to ${e.entity_name ?? "a department"}`,
  supervisor_assigned: (e) =>
    `${e.entity_name ?? "Someone"} assigned as supervisor for ${e.target_name ?? "someone"}`,
  template_assigned: (e) =>
    `${e.entity_name ?? "A"} template assigned to ${e.target_name ?? e.entity_name ?? "someone"}`,
  shift_assigned: (e) =>
    `${e.entity_name ?? "A"} shift assigned to ${e.target_name ?? "someone"}`,
  report_submitted: (e) =>
    `${e.actor_name ?? "Someone"} submitted a report`,
  department_created: (e) =>
    `${e.actor_name ?? "Admin"} created ${e.entity_name ?? "a"} department`,
  department_edited: (e) =>
    `${e.actor_name ?? "Admin"} updated ${e.entity_name ?? "a"} department`,
  department_archived: (e) =>
    `${e.actor_name ?? "Admin"} archived ${e.entity_name ?? "a"} department`,
  attendance_recorded: (e) =>
    `${e.actor_name ?? "Admin"} recorded attendance for ${e.target_name ?? "someone"}`,
  leave_approved: (e) =>
    `${e.actor_name ?? "Admin"} approved leave for ${e.target_name ?? "someone"}`,
  leave_rejected: (e) =>
    `${e.actor_name ?? "Admin"} rejected leave for ${e.target_name ?? "someone"}`,
  accrual_run: (e) =>
    `${e.actor_name ?? "Admin"} ran monthly leave accrual`,
  org_settings_changed: (e) =>
    `${e.actor_name ?? "Admin"} updated organization settings`,
  template_created: (e) =>
    `${e.actor_name ?? "Admin"} created template ${e.entity_name ?? ""}`.trim(),
  template_edited: (e) =>
    `${e.actor_name ?? "Admin"} updated template ${e.entity_name ?? ""}`.trim(),
  template_archived: (e) =>
    `${e.actor_name ?? "Admin"} archived template ${e.entity_name ?? ""}`.trim(),
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

export function ActivityFeed({
  items,
  emptyMessage = "No recent activity.",
  canDelete = false,
}: {
  items: ActivityLogEntry[];
  emptyMessage?: string;
  canDelete?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteActivityEntry(id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete entry.");
      }
    });
  };

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const Icon = EVENT_ICONS[item.event_type] ?? FileText;
        const labelFn = EVENT_LABELS[item.event_type];
        const label = labelFn ? labelFn(item) : item.event_type;
        const href = getHref(item);

        const content = (
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-sm">{label}</p>
              <div className="flex items-center gap-2">
                {item.actor_id && item.actor_name ? (
                  <MemberAvatar
                    name={item.actor_name}
                    userId={item.actor_id}
                    size="table"
                  />
                ) : null}
                <p className="text-xs text-muted-foreground">
                  <LocalDateTime isoString={item.created_at} />
                </p>
              </div>
            </div>
          </div>
        );

        return (
          <li key={item.id} className="group relative">
            {href ? (
              <Link href={href} className="block hover:opacity-80">
                {content}
              </Link>
            ) : (
              content
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={isPending}
                className="absolute right-0 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Delete entry"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
