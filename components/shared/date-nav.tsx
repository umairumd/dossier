"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { shiftReportDate, todayInTimezone } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";

export function DateNav({
  date,
  baseHref,
  label,
  timezone,
}: {
  date: string;
  baseHref: string;
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

  return (
    <div className="flex items-center gap-2" aria-busy={isPending}>
      <button
        type="button"
        onClick={() => goToDate(previousDate)}
        disabled={isPending}
        className="text-sm text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        ← Previous
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isPending}
            className="rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            {isPending ? (
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-label="Loading"
              />
            ) : (
              (label ?? date)
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
              const formatted = `${y}-${m}-${d}`;
              goToDate(formatted);
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
          "text-sm text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        Next →
      </button>
    </div>
  );
}
