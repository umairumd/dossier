import { Card, CardContent, CardLabelHeader } from "@/components/ui/card";
import {
  isWorkingDay,
  shiftReportDate,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/attendance";
import type { DailyReport } from "@/types/report";

const STRIP_DAYS = 30;
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

const LEAVE_STATUSES: ReadonlySet<AttendanceStatus> = new Set([
  "leave",
  "half_leave",
]);

const OFF_STATUSES: ReadonlySet<AttendanceStatus> = new Set([
  "weekly_off",
  "holiday",
]);

type DayTone = "submitted" | "missed" | "weekend" | "leave" | "open";

function dayTone(
  date: string,
  today: string,
  submittedDates: Set<string>,
  workingDays: number[],
  attendanceByDate?: Map<string, AttendanceStatus>,
): DayTone {
  const status = attendanceByDate?.get(date);

  if (status && LEAVE_STATUSES.has(status)) {
    return "leave";
  }

  if (submittedDates.has(date)) {
    return "submitted";
  }

  if (
    (status && OFF_STATUSES.has(status)) ||
    !isWorkingDay(date, workingDays)
  ) {
    return "weekend";
  }

  if (date >= today) {
    return "open";
  }

  return "missed";
}

// Neutral tones: submitted days in the light neutral, missed days as a red
// outline (not a solid block), off days barely there, leave in amber.
const TONE_CLASS: Record<DayTone, string> = {
  submitted: "bg-foreground/75",
  missed: "bg-transparent ring-[1.5px] ring-inset ring-red-600/70 dark:ring-red-400/70",
  weekend: "bg-foreground/[0.06]",
  leave: "bg-amber-500/60 dark:bg-amber-300/55",
  open: "bg-transparent ring-1 ring-inset ring-foreground/15",
};

const TODAY_CLASS = "bg-transparent ring-2 ring-inset ring-foreground";

export function ActivityStrip({
  reports,
  timezone,
  workingDays = DEFAULT_WORKING_DAYS,
  attendanceByDate,
}: {
  reports: Pick<DailyReport, "report_date">[];
  timezone: string;
  workingDays?: number[];
  attendanceByDate?: Map<string, AttendanceStatus>;
}) {
  const today = todayInTimezone(timezone);
  const submittedDates = new Set(reports.map((report) => report.report_date));
  const days = Array.from({ length: STRIP_DAYS }, (_, index) =>
    shiftReportDate(today, -(STRIP_DAYS - 1 - index)),
  );
  const tones = days.map((date) =>
    dayTone(date, today, submittedDates, workingDays, attendanceByDate),
  );
  const submittedCount = tones.filter((tone) => tone === "submitted").length;
  const dueCount = submittedCount + tones.filter((tone) => tone === "missed").length;

  return (
    <Card>
      <CardLabelHeader
        label="Last 30 days"
        aside={dueCount > 0 ? `${submittedCount} of ${dueCount} working days` : undefined}
      />
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1 md:gap-1.5">
          {days.map((date, index) => (
            <span
              key={date}
              title={date}
              className={cn(
                "aspect-square w-full rounded-[3px] md:rounded-[5px]",
                date === today ? TODAY_CLASS : TONE_CLASS[tones[index]],
              )}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {(
            [
              [TONE_CLASS.submitted, "Submitted"],
              [TONE_CLASS.missed, "Missed"],
              [TONE_CLASS.leave, "Leave"],
              [TONE_CLASS.weekend, "Off"],
              [TODAY_CLASS, "Today"],
            ] as const
          ).map(([tone, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-[3px]", tone)} />
              {label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
