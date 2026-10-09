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
import { DayOffTag } from "@/components/shared/day-off-tag";
import {
  dateInTimezone,
  formatDate,
  shiftReportDate,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";

/**
 * The grouped day control: previous, the date (opens a calendar), next.
 * `DateNav` drives it with the URL; cards that load their own data (the
 * home Departments card) pass `onChange`. `size="sm"` fits a card header.
 */
export function DateStepper({
  date,
  timezone,
  onChange,
  isPending = false,
  isOffDay = false,
  size = "default",
}: {
  date: string;
  timezone: string;
  onChange: (next: string) => void;
  isPending?: boolean;
  isOffDay?: boolean;
  size?: "default" | "sm";
}) {
  const today = todayInTimezone(timezone);
  const isToday = date >= today;
  const centerLabel = date === today ? "Today" : formatDate(date);
  const h = size === "sm" ? "h-8" : "h-9";
  const icon = size === "sm" ? "size-8" : "size-9";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg bg-fill-subtle ring-1 ring-inset ring-edge",
        h,
      )}
      aria-busy={isPending}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(icon, "rounded-r-none rounded-l-lg")}
        onClick={() => onChange(shiftReportDate(date, -1))}
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
            className={cn(
              h,
              "min-w-20 rounded-none px-2 font-medium",
              isOffDay && "hover:bg-transparent dark:hover:bg-transparent",
            )}
          >
            {isPending ? (
              <Loader2
                className="mx-auto size-4 animate-spin text-muted-foreground"
                aria-label="Loading"
              />
            ) : isOffDay ? (
              <DayOffTag />
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
              onChange(dateInTimezone(selected, timezone));
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
        size="icon"
        className={cn(icon, "rounded-l-none rounded-r-lg")}
        onClick={() => onChange(shiftReportDate(date, 1))}
        disabled={isPending || isToday}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

export function DateNav({
  date,
  baseHref,
  timezone,
  isOffDay = false,
}: {
  date: string;
  baseHref: string;
  /** @deprecated Center always shows "Today" or formatDate(date). */
  label?: string;
  timezone: string;
  /** When true, center control shows DayOffTag instead of the date label. */
  isOffDay?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <DateStepper
      date={date}
      timezone={timezone}
      isOffDay={isOffDay}
      isPending={isPending}
      onChange={(next) =>
        startTransition(() => {
          router.push(`${baseHref}?date=${next}`);
        })
      }
    />
  );
}
