import { cn } from "@/lib/utils";

export interface MiniBarChartPoint {
  label: string;
  value: number;
  title?: string;
}

// Deliberately not a charting library — plain divs with height percentages
// scale responsively via flexbox and need no client JS, matching "mini
// charts (if lightweight)." Values are assumed 0-100 (percentages).
export function MiniBarChart({ points }: { points: MiniBarChartPoint[] }) {
  if (points.length === 0) {
    return null;
  }

  return (
    <div className="flex h-24 items-end gap-1.5">
      {points.map((point, index) => (
        <div
          key={index}
          className="flex flex-1 flex-col items-center gap-1"
          title={point.title ?? `${point.label}: ${Math.round(point.value)}%`}
        >
          <div className="flex h-20 w-full items-end rounded-sm bg-muted">
            <div
              className={cn(
                "w-full rounded-sm bg-primary transition-all",
                point.value === 0 && "bg-transparent",
              )}
              style={{ height: `${Math.min(100, Math.max(0, point.value))}%` }}
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
