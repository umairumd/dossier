"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayDateString } from "@/lib/helpers/dates";

// Changing the date navigates (?date=...) rather than filtering
// client-side over pre-fetched data — the server re-fetches
// getTeamReportsForDate for the new date, so this never has to load
// multiple days of history up front just to support picking one.
export function DateFilter({
  date,
  pathname = "/manager/team-reports",
}: {
  date: string;
  pathname?: string;
}) {
  const router = useRouter();
  const today = todayDateString();

  const goToDate = (nextDate: string) => {
    router.push(`${pathname}?date=${nextDate}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={date}
        max={today}
        onChange={(event) => event.target.value && goToDate(event.target.value)}
        className="w-auto"
      />
      {date !== today && (
        <Button type="button" variant="outline" size="sm" onClick={() => goToDate(today)}>
          Today
        </Button>
      )}
    </div>
  );
}
