import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Card, CardContent, CardLabelHeader } from "@/components/ui/card";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { cn } from "@/lib/utils";
import type { TeamMemberStanding } from "@/types/team-insights";

// Completion below this reads as "needs a nudge" (amber).
const NUDGE_BELOW = 70;

function StandingList({
  items,
  emptyMessage,
  metric,
  isWarning,
}: {
  items: TeamMemberStanding[];
  emptyMessage: string;
  metric: (item: TeamMemberStanding) => string;
  isWarning?: (item: TeamMemberStanding) => boolean;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Users className="size-4" />}
        title={emptyMessage}
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-foreground/[0.06]">
      {items.map((item) => (
        <li
          key={item.employeeId}
          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <MemberAvatar
            name={item.fullName}
            userId={item.employeeId}
            avatar={item.avatar}
            size="sm"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <EmployeeNameLink
              employeeId={item.employeeId}
              fullName={item.fullName}
              className="truncate text-sm hover:underline"
            />
            {item.designation && (
              <span className="truncate text-xs text-muted-foreground">
                {item.designation}
              </span>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 text-sm tabular-nums text-foreground/80",
              isWarning?.(item) && "text-amber-700 dark:text-amber-300",
            )}
          >
            {metric(item)}
          </span>
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
        <CardLabelHeader label="Longest streaks" aside="Consecutive days" />
        <CardContent>
          <StandingList
            items={longestStreaks}
            emptyMessage="No active streaks yet."
            metric={(item) => `${item.streak} ${item.streak === 1 ? "day" : "days"}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardLabelHeader label="Needs a nudge" aside="Last 30 days" />
        <CardContent>
          <StandingList
            items={frequentlyMissing}
            emptyMessage="Nobody is missing reports."
            metric={(item) => `${item.completionPercentage}%`}
            isWarning={(item) => item.completionPercentage < NUDGE_BELOW}
          />
        </CardContent>
      </Card>
    </div>
  );
}
