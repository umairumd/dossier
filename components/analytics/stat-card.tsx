import type { ReactNode } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// The one stat-card shape reused across the employee, manager, and admin
// dashboards — previously each dashboard hand-rolled its own
// Card/CardDescription/CardTitle stat block.
export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
  valueClassName,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
  valueClassName?: string;
}): ReactNode {
  return (
    <Card className="bg-gradient-to-b from-card to-card/60">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          {icon}
          {label}
        </CardDescription>
        <div className="flex items-baseline gap-2">
          <CardTitle className={cn("text-3xl", valueClassName)}>{value}</CardTitle>
          {unit && (
            <span className="text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        {hint && (
          <p className="text-xs font-normal text-muted-foreground">{hint}</p>
        )}
      </CardHeader>
    </Card>
  );
}
