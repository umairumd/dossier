"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PersonCell } from "@/components/shared/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { remindHandbookReaders } from "@/lib/actions/admin/handbook";
import type { ReaderStatus } from "@/lib/handbook/progress";

export interface ReaderEntry {
  id: string;
  name: string;
  avatar: unknown | null;
  designation: string | null;
  status: ReaderStatus;
  version: number | null;
}

export function HandbookReadProgress({
  docId,
  version,
  readers,
  remindedToday,
}: {
  docId: string;
  version: number;
  readers: ReaderEntry[];
  remindedToday: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [reminded, setReminded] = useState(remindedToday);
  const current = readers.filter((reader) => reader.status === "current").length;
  const waiting = readers.length - current;

  const remind = () => {
    startTransition(async () => {
      const result = await remindHandbookReaders(docId);
      if (!result.success) {
        toast.error(result.error ?? "Couldn't send reminders.");
        if (result.error?.includes("already")) setReminded(true);
        return;
      }
      setReminded(true);
      toast.success(
        `Reminded ${result.reminded} ${result.reminded === 1 ? "person" : "people"}.`,
      );
    });
  };

  return (
    <Card>
      <CardTitleHeader
        title={`Read by ${current} of ${readers.length} on v${version}`}
      />
      <CardContent className="flex flex-col gap-4">
        <Meter
          value={current}
          max={Math.max(readers.length, 1)}
          tone={readers.length > 0 && current === readers.length ? "success" : "neutral"}
          label="Read progress"
        />
        {readers.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No one matches who can see this yet.</p>
        ) : (
          <ul className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto">
            {readers.map((reader) => (
              <li key={reader.id} className="flex items-center justify-between gap-3">
                <PersonCell
                  id={reader.id}
                  name={reader.name}
                  avatar={reader.avatar}
                  detail={reader.designation ?? undefined}
                />
                {reader.status === "current" ? (
                  <Badge variant="success" className="shrink-0 tabular-nums">Read v{version}</Badge>
                ) : reader.status === "older" ? (
                  <Badge variant="warning" className="shrink-0 tabular-nums">
                    Read v{reader.version} only
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="shrink-0">Not read</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
        {waiting > 0 ? (
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={remind}
              disabled={pending || reminded}
            >
              {pending
                ? "Sending…"
                : `Remind the ${waiting} who ${waiting === 1 ? "hasn't" : "haven't"}`}
            </Button>
            {reminded ? (
              <p className="text-xs text-muted-foreground">A reminder went out today.</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
