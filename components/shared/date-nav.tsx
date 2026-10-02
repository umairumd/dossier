"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  dateInTimezone,
  formatDate,
  shiftReportDate,
  todayInTimezone,
} from "@/lib/helpers/dates";

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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => goToDate(previousDate)}
        disabled={isPending}
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            className="min-w-20"
          >
            {isPending ? (
              <Loader2
                className="mx-auto size-4 animate-spin text-muted-foreground"
                aria-label="Loading"
              />
            ) : (
              centerLabel
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={new Date(`${date}T00:00:00`)}
            onSelect={(selected) => {
              if (!selected) return;
              // Same Intl en-CA + timeZone path as todayInTimezone /
              // getSubmissionStatus — never browser getFullYear/getMonth.
              goToDate(dateInTimezone(selected, timezone));
            }}
            disabled={(day) =>
              isPending || dateInTimezone(day, timezone) > today
            }
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => goToDate(nextDate)}
        disabled={isPending || isToday}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
