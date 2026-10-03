import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const interactiveClass =
  "hover:bg-foreground/5 active:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ListRow({
  leading,
  title,
  titleAddon,
  meta,
  trailing,
  href,
  onClick,
  showChevron,
  disabled = false,
}: {
  leading?: ReactNode;
  title: ReactNode;
  titleAddon?: ReactNode;
  meta?: ReactNode[];
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  showChevron?: boolean;
  disabled?: boolean;
}) {
  const clickable = !disabled && Boolean(href || onClick);
  const chevron = showChevron ?? clickable;
  const spacer = !chevron && !clickable;
  const segments = (meta ?? []).filter(
    (segment) => segment != null && segment !== false && segment !== "",
  );

  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-medium">{title}</span>
          {titleAddon ? (
            <span className="relative z-10 flex shrink-0 items-center gap-1">
              {titleAddon}
            </span>
          ) : null}
        </div>
        {segments.length > 0 && (
          <p className="flex min-w-0 text-xs text-muted-foreground">
            {segments.map((segment, index) => (
              <span
                key={index}
                className={index === 0 ? "min-w-0 truncate" : "shrink-0"}
              >
                {index > 0 ? " · " : null}
                {segment}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-2">
        {trailing ? (
          <div
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {trailing}
          </div>
        ) : null}
        {chevron ? (
          <ChevronRight className="pointer-events-none size-4 text-muted-foreground" />
        ) : null}
        {spacer ? <span className="inline-block size-4" aria-hidden /> : null}
      </div>
    </>
  );

  if (clickable && href) {
    return (
      <div
        className={cn(
          "relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          interactiveClass,
        )}
      >
        <Link
          href={href}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="sr-only">{typeof title === "string" ? title : "Open"}</span>
        </Link>
        {content}
      </div>
    );
  }

  if (clickable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          interactiveClass,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 px-4 py-3 text-left">
      {content}
    </div>
  );
}
