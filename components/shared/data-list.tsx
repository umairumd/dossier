import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { cn } from "@/lib/utils";

// One list for every list page (docs/UI_GUIDELINES.md "Lists").
// - `columns` is the desktop grid template; header and rows share it.
// - On phones a row is two columns: the first cell and the second cell
//   (status). Give any other cell `className="hidden md:block"`.
// - `variant="bare"` drops the card when the list sits inside a Card.

export function DataList({
  columns,
  header,
  variant = "card",
  className,
  children,
}: {
  columns: string;
  header?: ReactNode[];
  variant?: "card" | "bare";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        variant === "card"
          ? "surface-card overflow-hidden rounded-xl bg-card [--row-x:--spacing(4)]"
          : "-mx-(--card-spacing) [--row-x:var(--card-spacing)]",
        className,
      )}
      style={{ "--cols": columns } as CSSProperties}
    >
      {header && (
        <div
          aria-hidden
          className="hidden h-10 items-center gap-x-4 border-b border-foreground/[0.08] px-(--row-x) text-xs text-muted-foreground md:grid md:grid-cols-(--cols)"
        >
          {header.map((cell, index) => (
            <span key={index} className="truncate">
              {cell}
            </span>
          ))}
        </div>
      )}
      <ul className="flex flex-col divide-y divide-foreground/[0.06]">{children}</ul>
    </div>
  );
}

export function DataListSection({
  title,
  aside,
}: {
  title: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <li className="flex h-11 items-center justify-between gap-3 bg-foreground/[0.025] px-(--row-x)">
      <span className="truncate text-[13px] font-semibold">{title}</span>
      {aside != null && aside !== false && (
        <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
          {aside}
        </span>
      )}
    </li>
  );
}

/**
 * A row. When it opens something, pass `onClick` or `href` with `label`:
 * an overlay makes the whole row the target; links inside the row need
 * `relative z-10` to stay clickable.
 */
export function DataListRow({
  onClick,
  href,
  label,
  className,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const interactive = Boolean(onClick || href);
  return (
    <li
      className={cn(
        "relative grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-(--row-x) py-2.5 md:grid-cols-(--cols)",
        interactive && "transition-colors hover:bg-foreground/[0.03]",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          aria-label={label}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        />
      ) : onClick ? (
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        />
      ) : null}
      {children}
    </li>
  );
}

/** Trailing chevron cell for rows that open something (desktop). */
export function DataListChevron({ show = true }: { show?: boolean }) {
  return (
    <span aria-hidden className="hidden justify-end text-muted-foreground md:flex">
      {show ? <ChevronRight className="size-4" /> : null}
    </span>
  );
}

/** Buddy, name (optionally linked) and a muted second line. */
export function PersonCell({
  id,
  name,
  avatar,
  detail,
  href,
  addon,
}: {
  id: string;
  name: string;
  avatar?: unknown;
  detail?: ReactNode;
  href?: string;
  addon?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <MemberAvatar userId={id} name={name} avatar={avatar} size="md" />
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          {href ? (
            <Link
              href={href}
              className="relative z-10 truncate text-sm font-medium underline-offset-4 hover:underline"
            >
              {name}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium">{name}</span>
          )}
          {addon}
        </span>
        {detail ? (
          <span className="truncate text-[13px] text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </span>
  );
}
