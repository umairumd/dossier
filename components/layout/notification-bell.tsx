"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Notification } from "@/types/notification";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  leave_approved: "✓",
  leave_rejected: "✗",
  report_deadline: "⏰",
  employee_invited: "👋",
  employee_onboarded: "🎉",
  attendance_fine: "⚠",
  leave_request_submitted: "📋",
};

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
        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {displayCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {displayCount > 9 ? "9+" : displayCount}
            </span>
          )}
        </button>
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
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {initialNotifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 border-b border-border/50 px-4 py-3 last:border-0",
                    !n.read_at && !hasOpened && "bg-primary/5",
                  )}
                >
                  <span className="mt-0.5 text-base leading-none">
                    {TYPE_ICONS[n.type] ?? "•"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
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
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
