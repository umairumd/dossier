import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ListGroupCard({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-gradient overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      {title != null && title !== "" && (
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0 truncate text-sm font-medium">{title}</div>
          {aside}
        </div>
      )}
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}
