"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

// Filter with a handful of values: a row of segments with counts, same look
// as the Tabs list. Scrolls sideways on narrow screens.
export function SegmentedFilter<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** Accessible name for the group. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex h-9 max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg bg-fill-hover p-[3px] ring-1 ring-inset ring-edge [scrollbar-width:none]",
        className,
      )}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-full shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              on
                ? "bg-background text-foreground shadow-sm ring-1 ring-edge dark:bg-fill-active dark:shadow-none"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="tabular-nums text-muted-foreground">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
