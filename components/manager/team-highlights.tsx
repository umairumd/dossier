import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import type { TeamMemberStanding } from "@/types/team-insights";

function StandingList({
  items,
  emptyMessage,
  metric,
}: {
  items: TeamMemberStanding[];
  emptyMessage: string;
  metric: (item: TeamMemberStanding) => string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.employeeId}
          className="flex items-center justify-between text-sm"
        >
          <EmployeeNameLink
            employeeId={item.employeeId}
            fullName={item.fullName}
          />
          <span className="text-muted-foreground">{metric(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function TeamHighlights({
  longestStreaks,
  frequentlyMissing,
}: {
  longestStreaks: TeamMemberStanding[];
  frequentlyMissing: TeamMemberStanding[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Longest Streaks</CardTitle>
          <CardDescription>Most consecutive days reporting.</CardDescription>
        </CardHeader>
        <CardContent>
          <StandingList
            items={longestStreaks}
            emptyMessage="No active streaks yet."
            metric={(item) => `${item.streak} ${item.streak === 1 ? "day" : "days"}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Missing</CardTitle>
          <CardDescription>Lowest completion in the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <StandingList
            items={frequentlyMissing}
            emptyMessage="Nobody is missing reports."
            metric={(item) => `${item.completionPercentage}%`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
