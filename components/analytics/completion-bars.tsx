import { cn } from "@/lib/utils";
import type { CompletionTrendPoint } from "@/types/team-insights";

function shortDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Report completion as one bar per working day: green when everyone expected
 * reported. Days off are already left out of the series, so there are no
 * gaps to draw.
 */
export function CompletionBars({ trend, className }: { trend: CompletionTrendPoint[]; className?: string }) {
  if (trend.length === 0) {
    return <p className="text-sm text-muted-foreground">No working days in this period yet.</p>;
  }
  const middle = trend[Math.floor(trend.length / 2)];
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex h-24 items-end gap-1" role="img" aria-label="Report completion per working day">
        {trend.map((point) => {
          const pct = Math.max(0, Math.min(100, Math.round(point.completionPercentage)));
          const label =
            point.expected != null && point.submitted != null
              ? `${shortDay(point.date)}: ${point.submitted} of ${point.expected} reported`
              : `${shortDay(point.date)}: ${pct}%`;
          return (
            <span key={point.date} title={label} className="flex h-full flex-1 items-end">
              <span
                className={cn(
                  "block w-full rounded-t-[3px]",
                  pct >= 100 ? "bg-ok/80" : pct === 0 ? "bg-fill-active" : "bg-foreground/20",
                )}
                // An empty day still shows a sliver, so the day is visible.
                style={{ height: `${Math.max(pct, 3)}%` }}
              />
            </span>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{shortDay(trend[0].date)}</span>
        <span>{shortDay(middle.date)}</span>
        <span>{shortDay(trend[trend.length - 1].date)}</span>
      </div>
    </div>
  );
}
