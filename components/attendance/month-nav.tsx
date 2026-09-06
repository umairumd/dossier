"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

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
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = month >= currentMonth;
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`${baseHref}?month=${prevMonth}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Previous
      </Link>
      <span className="rounded-md px-2 py-1 text-sm font-medium">
        {formatMonthLabel(month)}
      </span>
      <Link
        href={`${baseHref}?month=${nextMonth}`}
        aria-disabled={isCurrentMonth}
        className={cn(
          "text-sm text-muted-foreground hover:text-foreground",
          isCurrentMonth && "pointer-events-none opacity-40",
        )}
      >
        Next →
      </Link>
    </div>
  );
}
