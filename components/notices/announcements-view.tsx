"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Megaphone, MoreHorizontal, Pin, Plus } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RichText } from "@/components/shared/rich-text";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComposeNoticeDialog, type ComposeData } from "@/components/notices/compose-notice-dialog";
import { EditNoticeDialog } from "@/components/notices/edit-notice-dialog";
import { SeenByDialog } from "@/components/notices/seen-by-dialog";
import { acknowledgeNotice, archiveNotice, markNoticesSeen } from "@/lib/actions/notices";
import { describeAudience } from "@/lib/handbook/audience";
import { cn } from "@/lib/utils";
import type { Notice, NoticeProgress } from "@/types/notice";

const PAGE_SIZE = 20;
/** The filter only shows once the page has this many posts. */
const FILTER_FROM = 6;

type Filter = "all" | "ack" | "mine";

function ago(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function listNames(names: string[], total: number): string {
  if (names.length === 0) return "";
  const more = total - names.length;
  if (more > 0) return `${names.join(", ")} and ${more} more`;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function AnnouncementsView({
  notices,
  viewerId,
  leader,
  today,
  departmentNames,
  compose,
  progress = {},
}: {
  notices: Notice[];
  viewerId: string;
  leader: boolean;
  today: string;
  departmentNames: Record<string, string>;
  compose: ComposeData | null;
  /** Reach and confirmations, for posts the viewer may manage. */
  progress?: Record<string, NoticeProgress>;
}) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [seenBy, setSeenBy] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [acked, setAcked] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [, startTransition] = useTransition();
  // New since the last visit: decided once, when the page opens.
  const [newIds] = useState(
    () => new Set(notices.filter((notice) => !notice.seenAt && notice.createdBy !== viewerId).map((n) => n.id)),
  );

  // Opening the page counts as seeing what's on it.
  useEffect(() => {
    if (newIds.size > 0) void markNoticesSeen([...newIds]);
  }, [newIds]);

  const lookups = { departmentNames: new Map(Object.entries(departmentNames)) };
  const isPinned = (notice: Notice) => Boolean(notice.pinnedUntil && notice.pinnedUntil >= today);
  const needsMe = (notice: Notice) =>
    notice.requiresAck && notice.createdBy !== viewerId && !notice.acknowledgedAt && !acked.includes(notice.id);
  const newest = (a: Notice, b: Notice) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");

  const filtered = notices.filter((notice) =>
    filter === "ack" ? needsMe(notice) : filter === "mine" ? notice.createdBy === viewerId : true,
  );
  const pinned = filtered.filter(isPinned).sort(newest);
  const others = filtered.filter((notice) => !isPinned(notice)).sort(newest);
  const fresh = others.filter((notice) => newIds.has(notice.id));
  const earlier = others.filter((notice) => !newIds.has(notice.id));
  const earlierShown = earlier.slice(0, Math.max(0, shown - pinned.length - fresh.length));
  const hidden = earlier.length - earlierShown.length;

  const waitingForMe = notices.filter(needsMe).length;
  const postsMine = notices.some((notice) => notice.createdBy === viewerId);
  const filterOptions = [
    { value: "all" as const, label: "All" },
    { value: "ack" as const, label: waitingForMe ? `Needs my OK · ${waitingForMe}` : "Needs my OK" },
    ...(postsMine || compose ? [{ value: "mine" as const, label: "Posted by me" }] : []),
  ];

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
    const pinnedNow = isPinned(notice);
    const offHome = Boolean(notice.endsAt && notice.endsAt < today);
    const audience = personal
      ? mine && notice.targetName
        ? `Personal, to ${notice.targetName}`
        : "Personal, to you"
      : describeAudience(notice.audiences, lookups);
    const stats = manage ? progress[notice.id] : undefined;
    const iConfirmed = notice.requiresAck && !mine && !needsMe(notice);
    return (
      <li
        key={notice.id}
        id={`notice-${notice.id}`}
        className={cn(
          "surface-card flex scroll-mt-20 flex-col gap-3 rounded-xl bg-card p-5",
          pinnedNow && "ring-1 ring-holiday/30",
        )}
      >
        <div className="flex items-start gap-3">
          <MemberAvatar
            name={notice.createdByName ?? "Someone"}
            userId={notice.createdBy ?? undefined}
            avatar={notice.createdByAvatar ?? null}
            size="sm"
            className="mt-0.5 shrink-0"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm">
              <span className="font-medium">{notice.createdByName ?? "Someone"}</span>
              <span className="text-muted-foreground"> · {ago(notice.publishedAt)}</span>
              {notice.editedAt ? <span className="text-muted-foreground"> (edited)</span> : null}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex max-w-full items-center truncate rounded-md bg-fill-active px-2 py-0.5 text-[11.5px] text-foreground/80 ring-1 ring-inset ring-edge">
                To: {audience}
              </span>
              {pinnedNow ? (
                <span className="inline-flex items-center gap-1 text-[11.5px] text-holiday">
                  <Pin className="size-3" />
                  Pinned to {formatDate(notice.pinnedUntil!)}
                </span>
              ) : null}
              {offHome && manage ? (
                <span className="rounded-md bg-fill-subtle px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  No longer on Home
                </span>
              ) : null}
            </div>
          </div>
          {newIds.has(notice.id) ? (
            <span className="mt-2 size-2 shrink-0 rounded-full bg-info" aria-label="New" />
          ) : null}
          {manage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More" className="-mt-1 -mr-2 size-8 shrink-0">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {personal ? null : <DropdownMenuItem onSelect={() => setEditing(notice)}>Edit</DropdownMenuItem>}
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

        {/* Same page width as everywhere else; only the text keeps a
            comfortable line length. */}
        <div className="flex max-w-[75ch] flex-col gap-1.5 md:pl-11">
          <h2 className="text-base font-semibold tracking-tight">{notice.title}</h2>
          {notice.bodyMd ? <RichText text={notice.bodyMd} className="text-foreground/85" /> : null}
        </div>

        {stats && stats.total > 0 ? (
          <button
            type="button"
            onClick={() => setSeenBy(notice)}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-left text-[12.5px] text-muted-foreground hover:text-foreground md:ml-11"
          >
            <span className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-fill-active">
              <span
                className="block h-full rounded-full bg-ok"
                style={{
                  width: `${Math.round(((notice.requiresAck ? stats.acknowledged : stats.seen) / stats.total) * 100)}%`,
                }}
              />
            </span>
            <span>
              <span className="font-medium text-foreground tabular-nums">
                {notice.requiresAck ? stats.acknowledged : stats.seen} of {stats.total}
              </span>{" "}
              {notice.requiresAck ? "acknowledged" : "have seen it"}
            </span>
            {stats.waitingCount > 0 ? (
              <span>Not yet: {listNames(stats.waitingNames, stats.waitingCount)}</span>
            ) : null}
          </button>
        ) : null}

        {needsMe(notice) ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3 md:ml-11">
            <Button size="sm" onClick={() => acknowledge(notice.id)} className="max-md:min-h-11 max-md:flex-1">
              I understand
            </Button>
            <span className="text-xs text-muted-foreground max-md:hidden">
              {notice.createdByName?.split(" ")[0] ?? "They"} asked everyone to confirm they{"'"}ve read this
            </span>
          </div>
        ) : iConfirmed ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:ml-11">
            <Check className="size-3.5 text-ok" />
            You acknowledged this
          </p>
        ) : null}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-5">
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

      {notices.length >= FILTER_FROM || filter !== "all" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedFilter label="Show" value={filter} onChange={setFilter} options={filterOptions} />
          {newIds.size > 0 ? (
            <span className="text-xs text-muted-foreground">
              {newIds.size} new since your last visit
            </span>
          ) : null}
        </div>
      ) : null}

      {notices.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title="No announcements yet"
          description={compose ? "Post one and it shows on everyone's Home." : "News from the team will show here."}
        />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {filter === "ack" ? "Nothing waiting for you." : "You haven't posted anything yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pinned.map(renderNotice)}
          {fresh.map(renderNotice)}
          {(pinned.length || fresh.length) && earlierShown.length ? (
            <li className="flex items-center gap-3 pt-2 text-xs text-muted-foreground after:h-px after:flex-1 after:bg-line">
              Earlier
            </li>
          ) : null}
          {earlierShown.map(renderNotice)}
        </ul>
      )}

      {hidden > 0 ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setShown((count) => count + PAGE_SIZE)}>
            Show older
          </Button>
        </div>
      ) : null}

      {compose ? (
        <ComposeNoticeDialog open={composeOpen} onOpenChange={setComposeOpen} data={compose} today={today} />
      ) : null}
      <EditNoticeDialog
        notice={editing}
        viewerId={viewerId}
        today={today}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
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
