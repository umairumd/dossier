import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MiniBarChart } from "@/components/analytics/mini-bar-chart";
import { formatDate } from "@/lib/helpers/dates";
import type { CompletionTrendPoint } from "@/types/team-insights";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});
const DAY_OF_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
});

// Shared by the manager dashboard's 7-day trend and the admin overview's
// weekly/monthly trends — one chart-card implementation, not three.
export function CompletionTrendCard({
  title,
  description,
  trend,
  emptyMessage = "No reports submitted in this period.",
}: {
  title: string;
  description?: string;
  trend: CompletionTrendPoint[];
  emptyMessage?: string;
}) {
  const hasData = trend.some((point) => point.completionPercentage > 0);
  // More than ~10 points (the monthly trend) gets sparse labels — every
  // date labeled would be unreadable, especially on mobile.
  const isDense = trend.length > 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {hasData ? (
          <MiniBarChart
            points={trend.map((point, index) => {
              const date = new Date(`${point.date}T00:00:00Z`);
              const showLabel = !isDense || index % 5 === 0;
              return {
                label: showLabel
                  ? (isDense ? DAY_OF_MONTH_FORMATTER : WEEKDAY_FORMATTER).format(
                      date,
                    )
                  : "",
                value: point.completionPercentage,
                title: `${formatDate(point.date)}: ${point.completionPercentage}%`,
              };
            })}
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
