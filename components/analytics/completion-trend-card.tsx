"use client";

import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MiniBarChart } from "@/components/analytics/mini-bar-chart";
import { cn } from "@/lib/utils";
import type { CompletionTrendPoint } from "@/types/team-insights";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});
const DAY_OF_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
});
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// Neutral chart palette from globals.css (--chart-1…5 are greyscale).
// 100% = foreground (near-white in dark); anything submitted but incomplete
// uses chart-2 grey so full days clearly stand out on the card.
function barFill(value: number): string {
  if (value <= 0) {
    return "color-mix(in oklch, var(--foreground) 10%, transparent)";
  }
  if (value >= 100) {
    return "var(--foreground)";
  }
  return "var(--chart-2)";
}

// Shared by the manager dashboard's 7-day trend and the admin overview's
// weekly/monthly trends — one chart-card implementation, not three.
export function CompletionTrendCard({
  title,
  description,
  trend,
  emptyMessage = "No reports submitted in this period.",
  embedded = false,
  dimmed = false,
  footnote,
}: {
  title: string;
  description?: string;
  trend: CompletionTrendPoint[];
  emptyMessage?: string;
  /** Render without the outer Card shell (for nesting inside another Card). */
  embedded?: boolean;
  dimmed?: boolean;
  footnote?: string;
}) {
  const hasData = trend.some((point) => point.completionPercentage > 0);
  // More than ~10 points (the monthly trend) gets sparse labels — every
  // date labeled would be unreadable, especially on mobile.
  const isDense = trend.length > 10;

  const chartPoints = trend.map((point, index) => {
    const date = new Date(`${point.date}T00:00:00Z`);
    const showLabel = !isDense || index % 5 === 0;
    const value = Math.min(100, point.completionPercentage);
    const weekday = WEEKDAY_FORMATTER.format(date);
    const dayOfMonth = DAY_OF_MONTH_FORMATTER.format(date);

    return {
      date: point.date,
      label: showLabel ? `${weekday} ${dayOfMonth}` : "",
      value,
      fill: barFill(value),
      missingNames: point.missingNames,
      title: FULL_DATE_FORMATTER.format(date),
      valueLabel: value > 0 ? `${value}%` : undefined,
    };
  });

  const header = (
    <CardHeader className={embedded ? "shrink-0 px-0" : undefined}>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );

  const content = (
    <CardContent
      className={
        embedded ? "flex min-h-0 flex-1 flex-col px-0 pb-0" : undefined
      }
    >
      {hasData ? (
        <MiniBarChart
          compact={embedded}
          dimmed={dimmed}
          className={embedded ? "min-h-0 flex-1" : undefined}
          points={chartPoints}
        />
      ) : (
        <EmptyState
          size="sm"
          icon={<BarChart3 className="size-4" />}
          title={emptyMessage}
        />
      )}
      {footnote && (
        <p
          className={cn(
            "mt-2 shrink-0 text-[10px] text-muted-foreground",
            dimmed && "opacity-50",
          )}
        >
          {footnote}
        </p>
      )}
    </CardContent>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-[200px] flex-col gap-4 md:min-h-0">
        <div className={cn(dimmed && "opacity-50")}>{header}</div>
        {content}
      </div>
    );
  }

  return (
    <Card className="card-gradient">
      <div className={cn(dimmed && "opacity-50")}>{header}</div>
      {content}
    </Card>
  );
}
