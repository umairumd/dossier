"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getNoticeSeenBy, type SeenByRow } from "@/lib/actions/notices";
import { cn } from "@/lib/utils";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SeenByDialog({
  noticeId,
  title,
  onOpenChange,
}: {
  noticeId: string | null;
  title: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<
    { id: string; rows: SeenByRow[]; requiresAck: boolean } | { id: string; error: string } | null
  >(null);

  useEffect(() => {
    if (!noticeId) return;
    let live = true;
    getNoticeSeenBy(noticeId).then((result) => {
      if (!live) return;
      setState(
        result.success
          ? { id: noticeId, rows: result.rows, requiresAck: result.requiresAck }
          : { id: noticeId, error: result.error },
      );
    });
    return () => {
      live = false;
    };
  }, [noticeId]);

  const current = state && state.id === noticeId ? state : null;
  const rows = current && "rows" in current ? current.rows : [];
  const requiresAck = current && "rows" in current ? current.requiresAck : false;
  const done = rows.filter((row) => (requiresAck ? row.acknowledgedAt : row.seenAt)).length;

  return (
    <Dialog open={noticeId != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{requiresAck ? "Acknowledged by" : "Seen by"}</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] overflow-y-auto">
          {!current ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : "error" in current ? (
            <p className="text-sm text-muted-foreground">{current.error}</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">
                  {done} of {rows.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-fill-active">
                <div
                  className="h-full rounded-full bg-ok"
                  style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }}
                />
              </div>
              <ul className="flex flex-col divide-y divide-line">
                {rows.map((row) => {
                  const at = requiresAck ? row.acknowledgedAt : row.seenAt;
                  return (
                    <li key={row.id} className="flex items-center gap-3 py-2.5">
                      <MemberAvatar name={row.name} userId={row.id} avatar={row.avatar} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.name}</p>
                        {row.designation ? (
                          <p className="truncate text-xs text-muted-foreground">{row.designation}</p>
                        ) : null}
                      </div>
                      <span className={cn("shrink-0 text-xs", at ? "text-ok" : "text-warn")}>
                        {at
                          ? `${requiresAck ? "Acknowledged" : "Seen"} · ${when(at)}`
                          : requiresAck && row.seenAt
                            ? "Seen, not acknowledged"
                            : "Not yet"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
