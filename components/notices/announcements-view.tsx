"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Megaphone, MoreHorizontal, Pin, Plus } from "lucide-react";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RichText } from "@/components/shared/rich-text";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ComposeNoticeDialog,
  type ComposeData,
} from "@/components/notices/compose-notice-dialog";
import { SeenByDialog } from "@/components/notices/seen-by-dialog";
import { acknowledgeNotice, archiveNotice, markNoticesSeen } from "@/lib/actions/notices";
import { audienceLabel } from "@/lib/handbook/audience";
import type { Notice } from "@/types/notice";

function formatDay(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function AnnouncementsView({
  notices,
  viewerId,
  leader,
  today,
  departmentNames,
  compose,
}: {
  notices: Notice[];
  viewerId: string;
  leader: boolean;
  today: string;
  departmentNames: Record<string, string>;
  compose: ComposeData | null;
}) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [seenBy, setSeenBy] = useState<Notice | null>(null);
  const [acked, setAcked] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  // Opening the page counts as seeing what's on it.
  useEffect(() => {
    const unseen = notices.filter((notice) => !notice.seenAt && notice.createdBy !== viewerId).map((n) => n.id);
    if (unseen.length > 0) void markNoticesSeen(unseen);
  }, [notices, viewerId]);

  const lookups = { departmentNames: new Map(Object.entries(departmentNames)) };
  const isPinned = (notice: Notice) => Boolean(notice.pinnedUntil && notice.pinnedUntil >= today);
  const newest = (a: Notice, b: Notice) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  const pinned = notices.filter(isPinned).sort(newest);
  const rest = notices.filter((notice) => !isPinned(notice)).sort(newest);

  const acknowledge = (id: string) =>
    startTransition(async () => {
      const result = await acknowledgeNotice(id);
      if (!result.success) toast.error(result.error);
      else setAcked((prev) => [...prev, id]);
    });
  const remove = (id: string) =>
    startTransition(async () => {
      const result = await archiveNotice(id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Removed.");
        router.refresh();
      }
    });

  const renderNotice = (notice: Notice) => {
    const mine = notice.createdBy === viewerId;
    const manage = mine || leader;
    const personal = notice.kind === "personal";
    const ended = Boolean(notice.endsAt && notice.endsAt < today);
    const needsMyAck = notice.requiresAck && !mine && !notice.acknowledgedAt && !acked.includes(notice.id);
    const audience = personal
      ? mine && notice.targetName
        ? `Personal, to ${notice.targetName}`
        : "Personal"
      : notice.audiences.map((rule) => audienceLabel(rule, lookups)).join(", ");
    const meta = [
      [notice.createdByName, formatDay(notice.publishedAt)].filter(Boolean).join(" · "),
      audience,
      isPinned(notice) ? `pinned to ${formatDate(notice.pinnedUntil!)}` : null,
      ended ? "off Home" : null,
    ]
      .filter(Boolean)
      .join(", ");
    return (
      <li key={notice.id} id={`notice-${notice.id}`} className="flex scroll-mt-20 gap-3 p-5">
        <MemberAvatar
          name={notice.createdByName ?? "Someone"}
          userId={notice.createdBy ?? undefined}
          avatar={null}
          size="sm"
          className="mt-0.5 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight">{notice.title}</h2>
              <p className="text-xs text-muted-foreground">{meta}</p>
            </div>
            {manage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="More" className="-mt-1 -mr-2 size-8 shrink-0">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setSeenBy(notice)}>
                    {notice.requiresAck ? "Who acknowledged" : "Who has seen it"}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => remove(notice.id)}>
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {notice.bodyMd ? <RichText text={notice.bodyMd} className="text-foreground/85" /> : null}
          {needsMyAck || (notice.requiresAck && !mine) || (manage && notice.requiresAck) ? (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {needsMyAck ? (
                <Button size="sm" onClick={() => acknowledge(notice.id)}>
                  I understand
                </Button>
              ) : notice.requiresAck && !mine ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="size-3.5 text-ok" />
                  You acknowledged this
                </span>
              ) : null}
              {manage && notice.requiresAck ? (
                <button
                  type="button"
                  onClick={() => setSeenBy(notice)}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Who acknowledged
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Announcements"
        description="News from the team, newest first."
        action={
          compose ? (
            <Button onClick={() => setComposeOpen(true)}>
              <Plus className="size-4" />
              {compose.canAnnounce ? "New announcement" : "Personal notice"}
            </Button>
          ) : null
        }
      />

      {notices.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title="No announcements yet"
          description={compose ? "Post one and it shows on everyone's Home." : "News from the team will show here."}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {pinned.length ? (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-1.5 px-1 text-[13px] font-medium text-muted-foreground">
                <Pin className="size-3.5" />
                Pinned
              </h2>
              <ul className="surface-card flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-card">
                {pinned.map(renderNotice)}
              </ul>
            </section>
          ) : null}
          {rest.length ? (
            <section className="flex flex-col gap-2">
              {pinned.length ? <h2 className="px-1 text-[13px] font-medium text-muted-foreground">Recent</h2> : null}
              <ul className="surface-card flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-card">
                {rest.map(renderNotice)}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {compose ? (
        <ComposeNoticeDialog open={composeOpen} onOpenChange={setComposeOpen} data={compose} today={today} />
      ) : null}
      <SeenByDialog
        noticeId={seenBy?.id ?? null}
        title={seenBy?.title ?? ""}
        onOpenChange={(open) => {
          if (!open) setSeenBy(null);
        }}
      />
    </div>
  );
}
