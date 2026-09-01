import Link from "next/link";
import { getOrgReportsForDate } from "@/lib/supabase/queries/admin/org-reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  formatDate,
  shiftReportDate,
  todayDateString,
} from "@/lib/helpers/dates";
import { OrgDailyReports } from "@/components/admin/org-daily-reports";
import { cn } from "@/lib/utils";

export default async function OrgReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = todayDateString();
  const date = dateParam ?? today;
  const isToday = date >= today;
  const previousDate = shiftReportDate(date, -1);
  const nextDate = shiftReportDate(date, 1);

  const [{ members, departments }, settings] = await Promise.all([
    getOrgReportsForDate(date),
    getOrganizationSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Daily Reports
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/admin/org-reports?date=${previousDate}`}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Previous
          </Link>
          <span className="font-medium">{formatDate(date)}</span>
          <Link
            href={`/admin/org-reports?date=${nextDate}`}
            aria-disabled={isToday}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isToday && "pointer-events-none opacity-40",
            )}
          >
            Next →
          </Link>
        </div>
      </div>

      <OrgDailyReports
        members={members}
        departments={departments}
        deadlineHourUtc={settings.reportDeadlineHourUtc}
      />
    </div>
  );
}
