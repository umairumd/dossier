"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTH_ABBREVS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MonthNav({
  month,
  baseHref,
  currentMonth: currentMonthProp,
  onMonthChange,
  pending = false,
}: {
  month: string; // "YYYY-MM"
  /** Navigates to `${baseHref}?month=` unless onMonthChange is given. */
  baseHref?: string;
  /** Switch months in place (no page navigation). */
  onMonthChange?: (yearMonth: string) => void;
  /** Loading state when the caller fetches the month itself. */
  pending?: boolean;
  /** Org-timezone current month (YYYY-MM). Caps forward navigation. */
  currentMonth?: string;
}) {
  const router = useRouter();
  const [navPending, startTransition] = useTransition();
  const isPending = navPending || pending;
  const now = new Date();
  const browserCurrentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonth = currentMonthProp ?? browserCurrentMonth;
  const currentYear = Number(currentMonth.split("-")[0]);
  const isCurrentMonth = month >= currentMonth;
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() =>
    Number(month.split("-")[0]),
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setPickerYear(Number(month.split("-")[0]));
    }
    setOpen(nextOpen);
  };

  const canGoNextYear = pickerYear < currentYear;

  const goToMonth = (yearMonth: string) => {
    if (yearMonth > currentMonth) return;
    setOpen(false);
    if (onMonthChange) {
      onMonthChange(yearMonth);
      return;
    }
    startTransition(() => {
      router.push(`${baseHref ?? ""}?month=${yearMonth}`);
    });
  };

  const handleSelectMonth = (monthIndex: number) => {
    const yearMonth = `${pickerYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    goToMonth(yearMonth);
  };

  return (
    <div
      className="inline-flex h-9 items-center rounded-lg bg-fill-subtle ring-1 ring-inset ring-edge"
      aria-busy={isPending}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-r-none rounded-l-lg"
        onClick={() => goToMonth(prevMonth)}
        disabled={isPending}
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            className="h-9 min-w-28 rounded-none px-2 text-sm font-medium"
          >
            {isPending ? (
              <Loader2
                className="mx-auto size-4 animate-spin text-muted-foreground"
                aria-label="Loading"
              />
            ) : (
              formatMonthLabel(month)
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="center">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setPickerYear((y) => y - 1)}
                aria-label="Previous year"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-medium">{pickerYear}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={!canGoNextYear}
                onClick={() => setPickerYear((y) => y + 1)}
                aria-label="Next year"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {MONTH_ABBREVS.map((abbrev, index) => {
                const yearMonth = `${pickerYear}-${String(index + 1).padStart(2, "0")}`;
                const isSelected = yearMonth === month;
                const isFuture = yearMonth > currentMonth;

                return (
                  <Button
                    key={abbrev}
                    type="button"
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    disabled={isFuture}
                    className={cn(
                      "h-8 text-xs",
                      isSelected && "pointer-events-none",
                    )}
                    onClick={() => handleSelectMonth(index)}
                  >
                    {abbrev}
                  </Button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-l-none rounded-r-lg"
        onClick={() => goToMonth(nextMonth)}
        disabled={isPending || isCurrentMonth}
        aria-label="Next month"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
