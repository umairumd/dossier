"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthNav({
  month,
  baseHref,
}: {
  month: string; // "YYYY-MM"
  baseHref: string;
}) {
  const router = useRouter();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = now.getFullYear();
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

  const handleSelectMonth = (monthIndex: number) => {
    const yearMonth = `${pickerYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    if (yearMonth > currentMonth) return;
    setOpen(false);
    router.push(`${baseHref}?month=${yearMonth}`);
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="size-8" asChild>
        <Link href={`${baseHref}?month=${prevMonth}`} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </Link>
      </Button>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="min-w-28 px-2 py-1 text-sm font-medium"
          >
            {formatMonthLabel(month)}
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

      {isCurrentMonth ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link href={`${baseHref}?month=${nextMonth}`} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
