"use client";

import { useState } from "react";
import {
  BookOpenCheck,
  CalendarX,
  CircleAlert,
  FileClock,
  Megaphone,
  Timer,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ForYouIcon, type ForYouItem } from "@/components/dashboard/hero-for-you";
import { RichText } from "@/components/shared/rich-text";
import { Button } from "@/components/ui/button";
import { acknowledgeNotice, dismissAutoNotice, dismissNotice } from "@/lib/actions/notices";
import { cn } from "@/lib/utils";
import type { AutoNotice, Notice, NoticeRuleKey } from "@/types/notice";

const RULE_ICONS: Record<NoticeRuleKey, LucideIcon> = {
  missed_reports: FileClock,
  over_balance: CalendarX,
  leave_low: CalendarX,
  late_often: Timer,
  handbook_unconfirmed: BookOpenCheck,
  profile_missing: UserCog,
};

function since(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/**
 * Everything waiting for "I understand" goes in the band at the top of Home,
 * one at a time: personal notices first, then announcements, oldest first.
 * The rest are rows in For you.
 */
export function splitNotices(notices: Notice[]): { band: Notice | null; waiting: number; rest: Notice[] } {
  const queue = notices
    .filter((notice) => notice.requiresAck)
    .sort(
      (a, b) =>
        Number(b.kind === "personal") - Number(a.kind === "personal") ||
        (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""),
    );
  return {
    band: queue[0] ?? null,
    waiting: queue.length,
    rest: notices.filter((notice) => !notice.requiresAck),
  };
}

export function noticeForYouItems(
  notices: Notice[],
  autos: AutoNotice[],
  hide: (key: string) => void,
): ForYouItem[] {
  const fromNotices = notices.map((notice): ForYouItem => {
    const key = `notice:${notice.id}`;
    const personal = notice.kind === "personal";
    const group = notice.requiresAck ? "action" : "news";
    const by = [notice.createdByName, since(notice.publishedAt)].filter(Boolean).join(" · ");
    return {
      id: notice.id,
      source: "notice",
      group,
      at: notice.publishedAt ?? "",
      icon: (
        <ForYouIcon group={group}>
          {personal ? <CircleAlert /> : <Megaphone />}
        </ForYouIcon>
      ),
      title: notice.title,
      meta: personal ? `Personal · ${by}` : by,
      actions: notice.requiresAck
        ? [
            {
              label: "I understand",
              doneLabel: "Acknowledged",
              onClick: async () => {
                const result = await acknowledgeNotice(notice.id);
                if (!result.success) {
                  toast.error(result.error);
                  return false;
                }
                hide(key);
                return true;
              },
            },
          ]
        : [{ label: "Read", href: `/announcements#notice-${notice.id}` }],
      onDismiss: notice.requiresAck
        ? undefined
        : () => {
            hide(key);
            void dismissNotice(notice.id);
          },
    };
  });

  const fromAutos = autos.map((auto): ForYouItem => {
    const key = `auto:${auto.key}`;
    const Icon = RULE_ICONS[auto.rule];
    return {
      id: auto.key,
      source: "auto",
      group: auto.group,
      // Automatic notices are about now; they sort first within their group.
      at: "9999",
      icon: (
        <ForYouIcon group={auto.group}>
          <Icon />
        </ForYouIcon>
      ),
      title: auto.title,
      meta: auto.meta,
      actions: auto.href ? [{ label: auto.actionLabel ?? "Open", href: auto.href }] : [],
      onDismiss: auto.dismissible
        ? () => {
            hide(key);
            void dismissAutoNotice(auto.key);
          }
        : undefined,
    };
  });

  return [...fromNotices, ...fromAutos];
}

/** A notice waiting for "I understand", across the top of the hero. */
export function NoticeBand({
  notice,
  waiting = 1,
  onDone,
}: {
  notice: Notice;
  /** How many are waiting, this one included. */
  waiting?: number;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const personal = notice.kind === "personal";
  return (
    <section
      aria-label={personal ? "Personal notice" : "Announcement to acknowledge"}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-start",
        personal ? "border-danger/35 bg-danger/[0.07]" : "border-info/35 bg-info/[0.07]",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          personal ? "bg-danger/15 text-danger" : "bg-info/15 text-info",
        )}
      >
        {personal ? <CircleAlert className="size-4" /> : <Megaphone className="size-4" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold">{notice.title}</p>
          <span className="rounded-md bg-fill-active px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {personal
              ? `Personal, only you${notice.createdByName ? ` and ${notice.createdByName.split(" ")[0]}` : ""} can see this`
              : "Please confirm you've read this"}
          </span>
          {waiting > 1 ? (
            <span className="text-[11px] text-muted-foreground tabular-nums">1 of {waiting}</span>
          ) : null}
        </div>
        {notice.bodyMd ? <RichText text={notice.bodyMd} className="text-[13.5px] text-foreground/85" /> : null}
        <p className="text-xs text-muted-foreground">
          {[notice.createdByName, since(notice.publishedAt)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={busy}
        className="shrink-0 max-md:min-h-11 max-md:self-stretch"
        onClick={async () => {
          setBusy(true);
          const result = await acknowledgeNotice(notice.id);
          setBusy(false);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("Thanks. That's been recorded.");
          onDone();
        }}
      >
        I understand
      </Button>
    </section>
  );
}
