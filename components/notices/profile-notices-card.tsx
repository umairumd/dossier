"use client";

import { useState } from "react";
import { Check, Clock, Plus } from "lucide-react";
import { ComposeNoticeDialog } from "@/components/notices/compose-notice-dialog";
import { RichText } from "@/components/shared/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";

type Row = {
  id: string;
  title: string;
  bodyMd: string;
  from: string | null;
  publishedAt: string | null;
  ackedAt: string | null;
  archived: boolean;
};

function day(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProfileNoticesCard({
  person,
  canSend,
  today,
  notices,
}: {
  person: { id: string; full_name: string; designation: string | null };
  canSend: boolean;
  today: string;
  notices: Row[];
}) {
  const [open, setOpen] = useState(false);
  const firstName = person.full_name.split(" ")[0];
  return (
    <Card>
      <CardTitleHeader
        title="Notices"
        aside={
          canSend ? (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" />
              Send a notice
            </Button>
          ) : null
        }
      />
      <CardContent>
        {notices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No personal notices. {firstName} sees one at the top of Home until they acknowledge it.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {notices.map((notice) => (
              <li key={notice.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{notice.title}</p>
                  <span
                    className={
                      "inline-flex shrink-0 items-center gap-1 text-xs " +
                      (notice.ackedAt ? "text-ok" : "text-warn")
                    }
                  >
                    {notice.ackedAt ? <Check className="size-3.5" /> : <Clock className="size-3.5" />}
                    {notice.ackedAt ? `Acknowledged ${day(notice.ackedAt)}` : "Not acknowledged yet"}
                  </span>
                </div>
                {notice.bodyMd ? (
                  <RichText text={notice.bodyMd} className="text-[13px] text-muted-foreground" />
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {[notice.from, day(notice.publishedAt), notice.archived ? "Removed" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {canSend ? (
        <ComposeNoticeDialog
          open={open}
          onOpenChange={setOpen}
          today={today}
          initialKind="personal"
          initialTargetId={person.id}
          data={{
            canAnnounce: false,
            canSendPersonal: true,
            restricted: true,
            departments: [],
            people: [],
            personalTargets: [
              {
                id: person.id,
                full_name: person.full_name,
                designation: person.designation,
                role: "member",
                employment_type: "full_time",
                is_remote: false,
                department_ids: [],
                is_supervisor: false,
              },
            ],
            designations: [],
          }}
        />
      ) : null}
    </Card>
  );
}
