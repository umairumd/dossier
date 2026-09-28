"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate, shiftReportDate, todayInTimezone } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";

export function DateNav({
  date,
  baseHref,
  timezone,
}: {
  date: string;
  baseHref: string;
  /** @deprecated Center always shows "Today" or formatDate(date). */
  label?: string;
  timezone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const today = todayInTimezone(timezone);
  const isToday = date >= today;
  const previousDate = shiftReportDate(date, -1);
  const nextDate = shiftReportDate(date, 1);

  const goToDate = (next: string) => {
    startTransition(() => {
      router.push(`${baseHref}?date=${next}`);
    });
  };

  const centerLabel = date === today ? "Today" : formatDate(date);

  return (
    <div className="flex items-center gap-1" aria-busy={isPending}>
      <button
        type="button"
        onClick={() => goToDate(previousDate)}
        disabled={isPending}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isPending}
            className="min-w-20 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            {isPending ? (
              <Loader2
                className="mx-auto size-4 animate-spin text-muted-foreground"
                aria-label="Loading"
              />
            ) : (
              centerLabel
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={new Date(`${date}T00:00:00`)}
            onSelect={(selected) => {
              if (!selected) return;
              const y = selected.getFullYear();
              const m = String(selected.getMonth() + 1).padStart(2, "0");
              const d = String(selected.getDate()).padStart(2, "0");
              goToDate(`${y}-${m}-${d}`);
            }}
            disabled={(day) => day > new Date() || isPending}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => goToDate(nextDate)}
        disabled={isPending || isToday}
        className={cn(
          "rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        )}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
