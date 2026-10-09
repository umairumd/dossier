import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A tile. "inset" (default) sits inside the hero card as a see-through panel;
 * "card" stands on the page and looks like every other card (bg-card and the
 * card sheen), with card padding (20px).
 */
export function Tile({
  className,
  surface = "inset",
  ...props
}: React.ComponentProps<"section"> & { surface?: "inset" | "card" }) {
  return (
    <section
      data-slot="tile"
      data-variant={surface}
      className={cn(
        "flex flex-col rounded-xl",
        surface === "card"
          ? "surface-card bg-card p-5"
          : "border border-edge bg-fill-subtle p-4 md:p-[18px]",
        className,
      )}
      {...props}
    />
  );
}

export function TileHeader({
  eyebrow,
  aside,
  className,
}: {
  eyebrow: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </h2>
      {aside != null && aside !== false && (
        <div className="shrink-0 text-xs text-muted-foreground">{aside}</div>
      )}
    </div>
  );
}

export function TileBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex min-h-0 flex-1 flex-col", className)} {...props} />;
}

export function TileActions({
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      data-slot="tile-actions"
      className={cn(
        "mt-auto flex flex-wrap items-center gap-2 pt-3",
        "[&_[data-slot=button]:not([data-size=icon])]:h-9",
        "max-md:[&_[data-slot=button]:not([data-size=icon])]:h-11",
        align === "end" && "justify-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A tile's secondary, navigational action ("View progress", "Wardrobe"):
 * a full-width footer row with a top divider, label on the left and a chevron
 * on the right. Sits flush with the tile's bottom edge, so it lines up across
 * neighbouring tiles regardless of how much content each one has.
 */
export function TileFooterAction({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <div className="-mx-4 mt-auto -mb-4 pt-4 md:-mx-[18px] md:-mb-[18px]">
      <button
        type="button"
        data-slot="tile-footer-action"
        className={cn(
          "group flex h-12 w-full items-center justify-between rounded-b-xl border-t border-edge px-4 text-sm font-medium text-muted-foreground transition-colors outline-none md:px-[18px]",
          "hover:bg-fill-subtle hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </button>
    </div>
  );
}
