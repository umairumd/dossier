"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  markDayAsHolidayAction,
  unmarkHolidayAction,
} from "@/lib/actions/admin/attendance";
import { formatDate } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";

function DayHeaderContent({
  day,
  dayInitial,
  isOff,
  isHoliday,
  isToday,
}: {
  day: number;
  dayInitial: string;
  isOff: boolean;
  isHoliday: boolean;
  isToday: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "text-[9px] font-medium uppercase",
          isToday
            ? "text-background/70"
            : isHoliday
              ? "text-teal-600/70 dark:text-teal-400/70"
              : isOff
                ? "text-muted-foreground/60"
                : "text-foreground",
        )}
      >
        {dayInitial}
      </span>
      <span className="inline-flex items-center gap-0.5">
        {isHoliday && !isToday && (
          <CalendarDays className="size-3" aria-hidden />
        )}
        <span
          className={cn(
            "text-xs font-medium",
            isToday
              ? "font-bold text-background"
              : isHoliday
                ? "text-teal-600 dark:text-teal-400"
                : isOff
                  ? "text-muted-foreground/60"
                  : "text-foreground",
          )}
        >
          {day}
        </span>
      </span>
    </>
  );
}

export function HolidayDayHeader({
  day,
  date,
  dayInitial,
  isOff,
  isHoliday,
  isToday = false,
  orgId,
  holidayName = null,
}: {
  day: number;
  date: string;
  dayInitial: string;
  isOff: boolean;
  isHoliday: boolean;
  isToday?: boolean;
  orgId: string;
  holidayName?: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (open: boolean) => {
    setConfirmOpen(open);
    if (!open) {
      setIsRenaming(false);
      setNameDraft("");
    }
  };

  const handleOpen = () => {
    setNameDraft(isHoliday ? (holidayName ?? "") : "");
    setIsRenaming(false);
    setConfirmOpen(true);
  };

  const handleMark = () => {
    startTransition(async () => {
      const result = await markDayAsHolidayAction(
        date,
        orgId,
        nameDraft.trim(),
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed to mark holiday");
        return;
      }
      if (result.count > 0) {
        toast.success(`Holiday marked for ${result.count} employees`);
      } else {
        toast.info("No eligible employees — all on approved leave");
      }
      setNameDraft("");
      setConfirmOpen(false);
    });
  };

  const handleRename = () => {
    startTransition(async () => {
      const result = await markDayAsHolidayAction(
        date,
        orgId,
        nameDraft.trim(),
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed to rename holiday");
        return;
      }
      toast.success("Holiday name updated");
      setIsRenaming(false);
      setConfirmOpen(false);
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await unmarkHolidayAction(date);
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove holiday");
        return;
      }
      toast.success("Holiday removed");
      setConfirmOpen(false);
    });
  };

  return (
    <>
      <th
        className={cn(
          "w-10 px-1 py-1.5 text-center",
          isHoliday
            ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
            : isOff
              ? "bg-muted"
              : undefined,
        )}
      >
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            "flex w-full flex-col items-center gap-0.5 rounded-md px-0.5 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isToday
              ? "bg-foreground text-background hover:bg-foreground"
              : "hover:bg-foreground/5",
          )}
          aria-label={
            isHoliday
              ? `Edit holiday on ${formatDate(date)}`
              : `Mark ${formatDate(date)} as holiday`
          }
        >
          <DayHeaderContent
            day={day}
            dayInitial={dayInitial}
            isOff={isOff}
            isHoliday={isHoliday}
            isToday={isToday}
          />
        </button>
      </th>

      <AlertDialog open={confirmOpen} onOpenChange={handleOpenChange}>
        {isHoliday ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Holiday</AlertDialogTitle>
              <AlertDialogDescription>
                {formatDate(date)}
                {holidayName
                  ? ` — ${holidayName}`
                  : " — Unnamed holiday"}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {isRenaming ? (
              <div className="flex flex-col gap-1.5 py-2">
                <Label htmlFor={`holiday-rename-${date}`}>Holiday name</Label>
                <Input
                  id={`holiday-rename-${date}`}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="e.g. Eid ul-Adha"
                  disabled={isPending}
                  autoFocus
                />
              </div>
            ) : null}

            <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleRemove}
              >
                {isPending ? "Removing…" : "Remove Holiday"}
              </Button>
              <div className="flex gap-2">
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                {isRenaming ? (
                  <Button disabled={isPending} onClick={handleRename}>
                    {isPending ? "Saving…" : "Save name"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setIsRenaming(true)}
                  >
                    Rename
                  </Button>
                )}
              </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Holiday</AlertDialogTitle>
              <AlertDialogDescription>
                Set every eligible employee to Holiday for {formatDate(date)}.
                Approved leave and half-leave records are left unchanged. Holiday
                name is optional.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1.5 py-2">
              <Label htmlFor={`holiday-name-${date}`}>Holiday name</Label>
              <Input
                id={`holiday-name-${date}`}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="e.g. Eid ul-Adha"
                disabled={isPending}
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button disabled={isPending} onClick={handleMark}>
                {isPending ? "Marking…" : "Mark Holiday"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  );
}
