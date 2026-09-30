import type { ReactNode } from "react";

// Vertical spacing below the header is owned by the parent page container
// (`flex flex-col gap-6`), so the header itself carries no outer margin.
export function PageHeader({
  title,
  count,
  countLabel,
  description,
  action,
  children,
  className,
}: {
  title: string;
  count?: number;
  countLabel?: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const hasSubtitle = count !== undefined || description;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {hasSubtitle && (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted-foreground">
              {count !== undefined && (
                <span>
                  {count} {countLabel ?? "items"}
                </span>
              )}
              {description}
            </div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && (
        <div className="mt-4 animate-in fade-in-0 duration-300 slide-in-from-bottom-2">
          {children}
        </div>
      )}
    </div>
  );
}
