import type { ReactNode } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendIndicator } from "@/components/analytics/trend-indicator";

// The one stat-card shape reused across the employee, manager, and admin
// dashboards — previously each dashboard hand-rolled its own
// Card/CardDescription/CardTitle stat block.
export function StatCard({
  label,
  value,
  unit,
  trend,
  positiveIsGood = true,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  positiveIsGood?: boolean;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-3xl">{value}</CardTitle>
          {unit && (
            <span className="text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        {trend !== undefined && (
          <TrendIndicator value={trend} positiveIsGood={positiveIsGood} />
        )}
      </CardHeader>
    </Card>
  );
}
