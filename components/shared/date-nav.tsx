"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const today = todayInTimezone(timezone);
  const isToday = date >= today;
  const previousDate = shiftReportDate(date, -1);
  const nextDate = shiftReportDate(date, 1);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`${baseHref}?date=${previousDate}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Previous
      </Link>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground"
          >
            {label ?? date}
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
              router.push(`${baseHref}?date=${formatted}`);
            }}
            disabled={(day) => day > new Date()}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <Link
        href={`${baseHref}?date=${nextDate}`}
        aria-disabled={isToday}
        className={cn(
          "text-sm text-muted-foreground hover:text-foreground",
          isToday && "pointer-events-none opacity-40",
        )}
      >
        Next →
      </Link>
    </div>
  );
}
