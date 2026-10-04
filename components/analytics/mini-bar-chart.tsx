import { cn } from "@/lib/utils";

export interface MiniBarChartPoint {
  label: string;
  value: number;
  title?: string;
  barClassName?: string;
  valueLabel?: string;
}

// Deliberately not a charting library — plain divs with height percentages
// scale responsively via flexbox and need no client JS, matching "mini
// charts (if lightweight)." Values are assumed 0-100 (percentages).
export function MiniBarChart({
  points,
  compact = false,
}: {
  points: MiniBarChartPoint[];
  /** Shorter, thinner bars for ambient dashboard use. */
  compact?: boolean;
}) {
  if (points.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-end",
        compact ? "h-[80px] max-h-[80px] justify-center gap-3" : "h-28 gap-1.5",
      )}
    >
      {points.map((point, index) => (
        <div
          key={index}
          className={cn(
            "flex flex-col items-center gap-1",
            compact ? "h-full w-2.5" : "flex-1",
          )}
          title={point.title ?? `${point.label}: ${Math.round(point.value)}%`}
        >
          {!compact && point.valueLabel && (
            <span className="h-4 text-xs text-muted-foreground">
              {point.valueLabel}
            </span>
          )}
          <div
            className={cn(
              "flex items-end rounded-sm bg-muted",
              compact ? "h-14 w-2.5" : "h-20 w-full",
            )}
          >
            <div
              className={cn(
                "w-full rounded-sm bg-primary transition-all",
                point.barClassName,
              )}
              style={{
                // Zero-value days: full muted stub so the day is visible
                // without a "0%" label.
                height:
                  point.value === 0
                    ? "100%"
                    : `${Math.min(100, Math.max(0, point.value))}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}
