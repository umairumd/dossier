import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  count,
  countLabel,
  action,
  children,
  className,
}: {
  title: string;
  count?: number;
  countLabel?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-6 -mt-6 mb-6 border-b border-border bg-background px-6 pt-6 pb-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {count !== undefined && (
            <p className="text-sm text-muted-foreground">
              {count} {countLabel ?? "items"}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
