import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Figure {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
}

// A row of key figures in one panel (profile stats, your reporting). One
// panel with dividers instead of a card per number.
export function FigureStrip({
  figures,
  variant = "card",
  className,
}: {
  figures: Figure[];
  /** "card" stands on its own; "inset" sits inside another card. */
  variant?: "card" | "inset";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-xl sm:grid-cols-(--cols)",
        variant === "card"
          ? "surface-card bg-card"
          : "ring-1 ring-inset ring-foreground/10",
        className,
      )}
      style={{ "--cols": `repeat(${figures.length}, minmax(0, 1fr))` } as React.CSSProperties}
    >
      {figures.map((figure, index) => (
        <div
          key={figure.label}
          className={cn(
            "flex min-w-0 flex-col gap-1.5 px-4 py-3.5 md:px-5 md:py-4",
            index > 0 && "border-t border-foreground/[0.06] sm:border-t-0 sm:border-l",
          )}
        >
          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground [&_svg]:size-4">
            {figure.icon}
            {figure.label}
          </span>
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-2xl font-semibold tracking-tight tabular-nums">
              {figure.value}
            </span>
            {figure.unit && (
              <span className="text-[13px] text-muted-foreground">{figure.unit}</span>
            )}
          </span>
          {figure.hint && (
            <span className="truncate text-xs text-muted-foreground">{figure.hint}</span>
          )}
        </div>
      ))}
    </div>
  );
}
