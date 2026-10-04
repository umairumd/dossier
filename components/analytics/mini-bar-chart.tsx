"use client";

import { Bar, BarChart, Cell, Rectangle, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export interface MiniBarChartPoint {
  label: string;
  value: number;
  title?: string;
  barClassName?: string;
  valueLabel?: string;
  /** ISO date YYYY-MM-DD — used for tooltip full date. */
  date?: string;
  /** Roster names who did not submit (embedded tooltips). */
  missingNames?: string[];
  /** Per-bar fill (CSS color). */
  fill?: string;
}

const chartConfig = {
  value: {
    label: "Completion",
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatFullDate(date: string | undefined): string {
  if (!date) return "";
  return FULL_DATE_FORMATTER.format(new Date(`${date}T00:00:00Z`));
}

function TrendTooltip({
  active,
  payload,
  compact,
}: {
  active?: boolean;
  // Recharts payload shape — keep loose to match ChartTooltip wiring.
  payload?: Array<{ payload?: MiniBarChartPoint }>;
  compact?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const fullDate = formatFullDate(point.date) || point.title || point.label;
  const missing = point.missingNames;

  // Match PopoverContent: bg-popover + text-popover-foreground (near-white
  // in dark mode). Avoid inheriting muted chart text or parent opacity.
  return (
    <div className="z-50 grid min-w-40 gap-1.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <div className="font-medium text-popover-foreground">{fullDate}</div>
      <div className="text-popover-foreground">
        {Math.round(point.value)}% completion
      </div>
      {compact && missing && (
        <div className="mt-0.5 border-t border-border pt-1.5">
          {missing.length === 0 ? (
            <span className="text-popover-foreground">All submitted ✓</span>
          ) : (
            <div className="flex flex-col gap-0.5 text-popover-foreground">
              <span className="font-medium">
                Missing ({missing.length})
              </span>
              {missing.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MiniBarChart({
  points,
  compact = false,
  dimmed = false,
  className,
}: {
  points: MiniBarChartPoint[];
  /** Embedded dashboard widget: missing-names tooltip. */
  compact?: boolean;
  /** Dim the plot only — tooltip stays full opacity (popover contrast). */
  dimmed?: boolean;
  className?: string;
}) {
  if (points.length === 0) {
    return null;
  }

  return (
    <ChartContainer
      config={chartConfig}
      className={cn(
        "w-full justify-start aspect-auto",
        compact ? "h-full min-h-[60px]" : "h-28 min-h-28",
        // Off-day dim: fade the SVG plot, never the tooltip wrapper.
        dimmed && "[&_.recharts-surface]:opacity-50",
        className,
      )}
      initialDimension={{ width: 320, height: compact ? 120 : 112 }}
    >
      <BarChart
        accessibilityLayer
        data={points}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          interval={0}
          tick={{ fontSize: 10 }}
          className="truncate"
        />
        <ChartTooltip
          cursor={{ fill: "var(--foreground)", opacity: 0.06 }}
          content={<TrendTooltip compact={compact} />}
          wrapperStyle={{ outline: "none", zIndex: 50, opacity: 1 }}
        />
        <Bar
          dataKey="value"
          radius={[3, 3, 0, 0]}
          maxBarSize={compact ? 48 : 56}
          isAnimationActive={false}
          // Keep the bar's own semantic fill; boost brightness at full
          // opacity so the hovered day clearly pops.
          activeBar={(props) => (
            <Rectangle
              {...props}
              radius={[3, 3, 0, 0]}
              opacity={1}
              style={{ filter: "brightness(1.25)" }}
            />
          )}
        >
          {points.map((point, index) => (
            <Cell
              key={index}
              fill={point.fill ?? "var(--foreground)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
