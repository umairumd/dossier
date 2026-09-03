import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  isWorkingDay,
  shiftReportDate,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";
import type { DailyReport } from "@/types/report";

const STRIP_DAYS = 30;
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

type DayTone = "submitted" | "missed" | "weekend" | "open";

function dayTone(
  date: string,
  today: string,
  submittedDates: Set<string>,
  workingDays: number[],
): DayTone {
  if (submittedDates.has(date)) {
    return "submitted";
  }

  if (!isWorkingDay(date, workingDays)) {
    return "weekend";
  }

  if (date >= today) {
    return "open";
  }

  return "missed";
}

const TONE_CLASS: Record<DayTone, string> = {
  submitted: "bg-primary",
  missed: "bg-destructive/40",
  weekend: "bg-muted",
  open: "border border-border bg-transparent",
};

export function ActivityStrip({
  reports,
  timezone,
  workingDays = DEFAULT_WORKING_DAYS,
}: {
  reports: Pick<DailyReport, "report_date">[];
  timezone: string;
  workingDays?: number[];
}) {
  const today = todayInTimezone(timezone);
  const submittedDates = new Set(reports.map((report) => report.report_date));
  const days = Array.from({ length: STRIP_DAYS }, (_, index) =>
    shiftReportDate(today, -(STRIP_DAYS - 1 - index)),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last 30 Days</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
          {days.map((date) => (
            <span
              key={date}
              title={date}
              className={cn(
                "aspect-square rounded-sm",
                TONE_CLASS[dayTone(date, today, submittedDates, workingDays)],
              )}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", TONE_CLASS.submitted)} />
            Submitted
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", TONE_CLASS.missed)} />
            Missed
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", TONE_CLASS.weekend)} />
            Off
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
