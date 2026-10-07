"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CompletionTrendPoint } from "@/types/team-insights";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const FULL = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function average(points: CompletionTrendPoint[]): number {
  if (points.length === 0) return 0;
  return Math.round(points.reduce((sum, point) => sum + point.completionPercentage, 0) / points.length);
}

function deltaCopy(current: number, previous: number): string {
  const delta = current - previous;
  if (delta === 0) return "same as the 30 days before";
  const word = delta > 0 ? "up" : "down";
  return `${word} ${Math.abs(delta)} pts from the 30 days before`;
}

export function CompletionLineChart({
  title,
  trend,
  previousAverage,
}: {
  title: string;
  trend: CompletionTrendPoint[];
  previousAverage: number | null;
}) {
  const avg = average(trend);
  return (
    <section className="rounded-xl bg-foreground/[0.03] p-[18px] ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">Last 30 days · working days</p>
        </div>
        <div className="text-right">
          <p className="text-[30px] font-semibold leading-none tracking-tight tabular-nums">{avg}%</p>
          {previousAverage != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              30-day average · {deltaCopy(avg, previousAverage)}
            </p>
          )}
        </div>
      </div>
      <Plot points={trend} />
      <p className="mt-2 text-[11px] text-muted-foreground">
        Weekends and holidays are skipped. Includes voluntary submissions.
      </p>
    </section>
  );
}

function Plot({ points }: { points: CompletionTrendPoint[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth(next);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const height = 200;
  const padL = 36;
  const padR = 16;
  const padT = 22;
  const padB = 28;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const xAt = (index: number) =>
    padL + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const yAt = (value: number) => padT + (1 - Math.min(100, Math.max(0, value)) / 100) * innerH;

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yAt(point.completionPercentage).toFixed(1)}`)
    .join(" ");
  const area =
    points.length > 0
      ? `${line} L ${xAt(points.length - 1).toFixed(1)} ${yAt(0).toFixed(1)} L ${xAt(0).toFixed(1)} ${yAt(0).toFixed(1)} Z`
      : "";
  const last = points.length - 1;
  const todayX = points.length ? xAt(last) : 0;

  function nearest(clientX: number) {
    const host = hostRef.current;
    if (!host || points.length === 0) return null;
    const rect = host.getBoundingClientRect();
    const local = clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    for (let index = 0; index < points.length; index += 1) {
      const dist = Math.abs(xAt(index) - local);
      if (dist < bestDist) {
        best = index;
        bestDist = dist;
      }
    }
    return best;
  }

  const hover = active != null ? points[active] : null;

  return (
    <div
      ref={hostRef}
      className="relative mt-3 h-40 outline-none md:h-[200px]"
      tabIndex={0}
      role="img"
      aria-label={
        hover
          ? `${FULL.format(new Date(`${hover.date}T00:00:00Z`))}, ${hover.completionPercentage} percent`
          : "Completion over the last 30 working days"
      }
      onPointerMove={(event) => setActive(nearest(event.clientX))}
      onPointerLeave={() => setActive(null)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        setActive((current) => {
          const start = current ?? last;
          const next = event.key === "ArrowRight" ? start + 1 : start - 1;
          return Math.min(last, Math.max(0, next));
        });
      }}
    >
      {width > 0 && points.length > 0 && (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full text-[#3f434a] dark:text-[#c9ccd1]" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.06" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          {[100, 50].map((tick) => (
            <line
              key={tick}
              x1={padL}
              x2={width - padR}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="var(--foreground)"
              strokeOpacity={0.06}
            />
          ))}
          <line
            x1={padL}
            x2={width - padR}
            y1={yAt(0)}
            y2={yAt(0)}
            stroke="var(--foreground)"
            strokeOpacity={0.12}
          />
          {[0, 50, 100].map((tick) => (
            <text
              key={tick}
              x={padL - 8}
              y={yAt(tick) + 4}
              textAnchor="end"
              fill="var(--muted-foreground)"
              fontSize={11}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {tick === 0 ? "0" : `${tick}%`}
            </text>
          ))}
          <path d={area} className="text-[#3f434a] dark:text-[#c9ccd1]" fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            pathLength={1}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-[#3f434a] motion-safe:[animation:completion-draw_400ms_ease-out] dark:stroke-[#c9ccd1]"
            style={{ strokeDasharray: 1 }}
          />
          {points.map((point, index) => {
            const x = xAt(index);
            const isToday = index === last;
            const nearToday = todayX - x < 40;
            const show = isToday || (index % 5 === 0 && !nearToday);
            if (!show) return null;
            const label = isToday ? "Today" : MONTH.format(new Date(`${point.date}T00:00:00Z`));
            return (
              <text
                key={point.date}
                x={x}
                y={height - 8}
                textAnchor={isToday ? "end" : "middle"}
                fill="var(--muted-foreground)"
                fontSize={11}
              >
                {label}
              </text>
            );
          })}
          {active != null && (
            <line
              x1={xAt(active)}
              x2={xAt(active)}
              y1={padT}
              y2={yAt(0)}
              stroke="var(--foreground)"
              strokeOpacity={0.25}
            />
          )}
          {active != null && (
            <circle
              cx={xAt(active)}
              cy={yAt(points[active].completionPercentage)}
              r={4}
              className="fill-foreground"
            />
          )}
          <circle
            cx={xAt(last)}
            cy={yAt(points[last].completionPercentage)}
            r={5}
            className="fill-foreground stroke-background"
            strokeWidth={2}
          />
          <text
            x={xAt(last) - 8}
            y={yAt(points[last].completionPercentage) - 10}
            textAnchor="end"
            fill="var(--foreground)"
            fontSize={11}
            fontWeight={500}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {points[last].completionPercentage}%
          </text>
        </svg>
      )}
      {hover && active != null && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 w-44 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10",
          )}
          style={{
            left: Math.min(Math.max(8, xAt(active) + 8), Math.max(8, width - 184)),
            top: 8,
          }}
        >
          <p className="font-medium">{FULL.format(new Date(`${hover.date}T00:00:00Z`))}</p>
          <p className="mt-0.5 tabular-nums">
            {hover.completionPercentage}%
            {hover.submitted != null && hover.expected != null
              ? ` · ${hover.submitted} of ${hover.expected} in`
              : ""}
          </p>
          {hover.missingNames && hover.missingNames.length > 0 && (
            <>
              <div className="my-1.5 h-px bg-foreground/10" />
              <p className="text-muted-foreground">Missing: {hover.missingNames.join(", ")}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
