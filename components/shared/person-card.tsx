import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One people card (Team Members, Birthdays): buddy, name, designation, an
// optional muted line, then a footer (stats or a date) under a hairline.
export function PersonCard({
  href,
  avatar,
  name,
  detail,
  meta,
  footer,
  tag,
  highlight = false,
  dimmed = false,
}: {
  href: string;
  /** The buddy, ~56px. */
  avatar: ReactNode;
  name: string;
  detail?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  /** Small pill in the top-right corner (e.g. "Today"). */
  tag?: ReactNode;
  highlight?: boolean;
  dimmed?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "surface-card surface-card-interactive relative flex h-full flex-col items-center gap-3 rounded-xl bg-card px-4 pt-5 pb-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        highlight && "border-primary/40",
        dimmed && "opacity-60",
      )}
    >
      {tag ? <span className="absolute top-3 right-3">{tag}</span> : null}
      {avatar}
      <span className="flex w-full min-w-0 flex-col items-center gap-0.5">
        <span className="w-full truncate text-[15px] font-semibold tracking-tight">{name}</span>
        {detail ? (
          <span className="w-full truncate text-[13px] text-muted-foreground">{detail}</span>
        ) : null}
        {meta ? (
          <span className="w-full truncate text-xs text-muted-foreground">{meta}</span>
        ) : null}
      </span>
      {footer ? (
        <span className="mt-auto flex w-full flex-col border-t border-edge pt-3">
          {footer}
        </span>
      ) : null}
    </Link>
  );
}

/** Two to four figures side by side, with readable labels. */
export function PersonCardStats({
  items,
}: {
  items: { value: ReactNode; label: string; title?: string }[];
}) {
  return (
    <span className="grid w-full" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item, index) => (
        <span
          key={item.label}
          title={item.title}
          className={cn(
            "flex min-w-0 flex-col items-center gap-0.5 px-1",
            index > 0 && "border-l border-edge",
          )}
        >
          <span className="max-w-full truncate text-[15px] font-semibold tabular-nums">
            {item.value}
          </span>
          <span className="max-w-full truncate text-[11.5px] text-muted-foreground">
            {item.label}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Heading above a group of cards: "October · 4". */
export function GroupHeading({
  label,
  count,
  className,
}: {
  label: string;
  count?: number;
  className?: string;
}) {
  return (
    <h2 className={cn("mb-3 flex items-baseline gap-1.5 text-[13px] font-semibold", className)}>
      {label}
      {count !== undefined && (
        <span className="font-normal tabular-nums text-muted-foreground">· {count}</span>
      )}
    </h2>
  );
}
