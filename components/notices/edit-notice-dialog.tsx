"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pin, X } from "lucide-react";
import { toast } from "sonner";
import { DateChip } from "@/components/notices/compose-notice-dialog";
import { RichEditor } from "@/components/shared/rich-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { editNotice } from "@/lib/actions/notices";
import { NOTICE_EDIT_WINDOW_MS, type Notice } from "@/types/notice";

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Change a posted announcement. The wording can be fixed by its author for an
 * hour after posting; the pin and Home date can be changed any time.
 */
export function EditNoticeDialog({
  notice,
  viewerId,
  today,
  onOpenChange,
}: {
  notice: Notice | null;
  viewerId: string;
  today: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(notice)} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {notice ? (
          <EditForm key={notice.id} notice={notice} viewerId={viewerId} today={today} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  notice,
  viewerId,
  today,
  onClose,
}: {
  notice: Notice;
  viewerId: string;
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openedAt] = useState(() => Date.now());
  const wordingOpen =
    notice.createdBy === viewerId &&
    Boolean(notice.publishedAt) &&
    openedAt - new Date(notice.publishedAt!).getTime() < NOTICE_EDIT_WINDOW_MS;
  const [title, setTitle] = useState(notice.title);
  const [body, setBody] = useState(notice.bodyMd);
  const [pinnedUntil, setPinnedUntil] = useState(notice.pinnedUntil ?? "");
  const [endsAt, setEndsAt] = useState(notice.endsAt ?? "");

  const save = () => {
    startTransition(async () => {
      const result = await editNotice(notice.id, {
        ...(wordingOpen ? { title, bodyMd: body } : {}),
        // Only dates that were changed, so an old pin in the past can stay.
        ...(pinnedUntil !== (notice.pinnedUntil ?? "") ? { pinnedUntil: pinnedUntil || null } : {}),
        ...(endsAt !== (notice.endsAt ?? "") ? { endsAt: endsAt || null } : {}),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved.");
      onClose();
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <DialogTitle className="text-[13px] font-medium text-muted-foreground">Edit announcement</DialogTitle>
        <DialogDescription className="sr-only">Change the wording, the pin or the Home date.</DialogDescription>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Close" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto px-5 pt-4 pb-4">
        {wordingOpen ? (
          <>
            <input
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Title"
              className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none"
            />
            <RichEditor value={body} onChange={setBody} minHeight={88} onSubmit={save} variant="bare" ariaLabel="Message" />
          </>
        ) : (
          <>
            <p className="text-xl font-semibold tracking-tight">{notice.title}</p>
            <p className="text-xs text-muted-foreground">
              {notice.createdBy === viewerId
                ? "The wording can be changed for an hour after posting. To change it now, remove it and post again."
                : "Only the author can change the wording, within an hour of posting."}
            </p>
          </>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <DateChip
            icon={<Pin />}
            emptyLabel="Not pinned"
            setLabel={(date) => `Pinned to ${shortDate(date)}`}
            value={pinnedUntil}
            onChange={setPinnedUntil}
            today={today}
            options={[
              { label: "For 3 days", days: 3 },
              { label: "For a week", days: 7 },
              { label: "For two weeks", days: 14 },
            ]}
          />
          <DateChip
            icon={<CalendarClock />}
            emptyLabel="On Home until read"
            setLabel={(date) => `On Home until ${shortDate(date)}`}
            value={endsAt}
            onChange={setEndsAt}
            today={today}
            options={[
              { label: "Today only", days: 0 },
              { label: "Until tomorrow", days: 1 },
              { label: "For a week", days: 7 },
            ]}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-line px-5 py-3">
        <span className="ml-auto text-xs text-muted-foreground max-sm:hidden">
          {wordingOpen ? "People see it marked Edited" : ""}
        </span>
        <Button onClick={save} disabled={pending || (wordingOpen && !title.trim())} className="max-sm:ml-auto">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}
