"use client";

import { useState, useTransition, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Bell,
  Cake,
  CalendarClock,
  CheckCircle,
  Clock,
  FileText,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Notification, NotificationType } from "@/types/notification";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<
  NotificationType,
  { Icon: ComponentType<{ className?: string }>; className: string }
> = {
  leave_approved: { Icon: CheckCircle, className: "text-green-500" },
  leave_rejected: { Icon: XCircle, className: "text-red-500" },
  report_deadline: { Icon: Clock, className: "text-amber-500" },
  employee_invited: { Icon: UserPlus, className: "text-blue-500" },
  employee_onboarded: { Icon: UserCheck, className: "text-blue-500" },
  attendance_fine: { Icon: AlertTriangle, className: "text-amber-500" },
  leave_request_submitted: { Icon: CalendarClock, className: "text-blue-500" },
  shift_assigned: { Icon: Clock, className: "text-blue-500" },
  template_assigned: { Icon: FileText, className: "text-blue-500" },
  supervisor_assigned: { Icon: Users, className: "text-blue-500" },
  employee_deactivated: { Icon: UserX, className: "text-amber-500" },
  employee_archived: { Icon: Archive, className: "text-amber-500" },
  birthday: { Icon: Cake, className: "text-pink-500" },
};

function resolveNotificationUrl(
  type: string,
  entityType: string | null,
  entityId: string | null,
): string | null {
  // entity-based links take priority
  if (entityType === "employee" && entityId) return `/employees/${entityId}`;
  if (entityType === "leave_request" && entityId) return `/leave`;
  if (entityType === "report" && entityId) return `/reports`;

  // type-based fallbacks
  switch (type) {
    case "leave_approved":
    case "leave_rejected":
    case "leave_request_submitted":
      return "/leave";
    case "report_deadline":
      return "/reports";
    case "employee_invited":
    case "employee_onboarded":
    case "employee_deactivated":
    case "employee_archived":
      return entityId ? `/employees/${entityId}` : "/employees";
    case "attendance_fine":
      return "/attendance";
    case "shift_assigned":
    case "template_assigned":
    case "supervisor_assigned":
      return "/attendance";
    case "birthday":
      return "/birthdays";
    default:
      return null;
  }
}

export function NotificationBell({
  initialCount,
  initialNotifications,
}: {
  initialCount: number;
  initialNotifications: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [, startTransition] = useTransition();

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !hasOpened && initialCount > 0) {
      setHasOpened(true);
      startTransition(async () => {
        await markAllNotificationsRead();
      });
    }
  };

  const displayCount = hasOpened ? 0 : initialCount;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative text-foreground/70"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {displayCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {displayCount > 9 ? "9+" : displayCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {initialCount > 0 && !hasOpened && (
            <span className="text-xs text-muted-foreground">
              {initialCount} unread
            </span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {initialNotifications.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<Bell className="size-4" />}
              title="No notifications yet."
            />
          ) : (
            <div className="flex flex-col">
              {initialNotifications.map((n) => {
                const icon = TYPE_ICONS[n.type];
                const Icon = icon?.Icon ?? Bell;
                const url = resolveNotificationUrl(
                  n.type,
                  n.entity_type,
                  n.entity_id,
                );

                const item = (
                  <div
                    className={cn(
                      "flex gap-3 border-b border-border/50 px-4 py-3 last:border-0",
                      !n.read_at && !hasOpened && "bg-primary/5",
                      url &&
                        "cursor-pointer transition-colors hover:bg-accent/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        icon?.className ?? "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );

                if (url) {
                  return (
                    <Link
                      key={n.id}
                      href={url}
                      className="block"
                      onClick={() => setOpen(false)}
                    >
                      {item}
                    </Link>
                  );
                }

                return <div key={n.id}>{item}</div>;
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
